"""Offline SVG rasterizer using installed librsvg/Cairo, with no pip extension.

Uses the stable C APIs via ctypes. This does not sandbox Python source modules.
"""
from __future__ import annotations
import ctypes as C
import ctypes.util
import re
import sys
import xml.etree.ElementTree as ET
from PIL import Image


class GError(C.Structure):
    _fields_ = [('domain', C.c_uint), ('code', C.c_int), ('message', C.c_char_p)]


class Rectangle(C.Structure):
    _fields_ = [('x', C.c_double), ('y', C.c_double), ('width', C.c_double), ('height', C.c_double)]


def validate_svg(svg: str) -> set[str]:
    """Reject external resources and active elements; return displayed characters."""
    if '<!DOCTYPE' in svg.upper() or '<!ENTITY' in svg.upper():
        raise ValueError('SVG DTD/entities are not allowed')
    root = ET.fromstring(svg)
    if root.tag.rsplit('}', 1)[-1] != 'svg':
        raise ValueError('render(t) must return a complete SVG')
    chars = set()
    for el in root.iter():
        tag = el.tag.rsplit('}', 1)[-1]
        if tag in {'script', 'foreignObject', 'animate', 'animateTransform', 'set', 'style'}:
            raise ValueError(f'SVG element {tag} is not supported in deterministic frames')
        if tag in {'text', 'tspan'}:
            chars.update(''.join(el.itertext()))
        for key, value in el.attrib.items():
            name = key.rsplit('}', 1)[-1]
            if name.lower().startswith('on'):
                raise ValueError('SVG event handlers are not allowed')
            if name == 'href' and not value.startswith(('#', 'data:image/png;base64,', 'data:image/jpeg;base64,')):
                raise ValueError('SVG external references are not allowed')
            for url in re.findall(r'url\s*\(\s*[\"\']?([^\)\"\']+)', value, flags=re.I):
                if not url.startswith('#'):
                    raise ValueError('SVG external CSS references are not allowed')
    return chars


class SvgRasterizer:
    def __init__(self, width: int, height: int):
        self.width, self.height = width, height
        self.rsvg = C.CDLL(ctypes_library('rsvg-2'))
        self.cairo = C.CDLL(ctypes_library('cairo'))
        self.gobject = C.CDLL(ctypes_library('gobject-2.0'))
        self.glib = C.CDLL(ctypes_library('glib-2.0'))
        self._bind()
        self.surface = self.cairo.cairo_image_surface_create(0, width, height)
        if not self.surface or self.cairo.cairo_surface_status(self.surface):
            raise RuntimeError('Could not allocate Cairo image surface')
        self.ctx = self.cairo.cairo_create(self.surface)
        self.stride = self.cairo.cairo_image_surface_get_stride(self.surface)
        self.viewport = Rectangle(0, 0, width, height)

    def _bind(self):
        specs = [
            (self.rsvg, 'rsvg_handle_new_from_data', [C.c_void_p, C.c_size_t, C.POINTER(C.POINTER(GError))], C.c_void_p),
            (self.rsvg, 'rsvg_handle_render_document', [C.c_void_p, C.c_void_p, C.POINTER(Rectangle), C.POINTER(C.POINTER(GError))], C.c_int),
            (self.cairo, 'cairo_image_surface_create', [C.c_int, C.c_int, C.c_int], C.c_void_p),
            (self.cairo, 'cairo_surface_status', [C.c_void_p], C.c_int),
            (self.cairo, 'cairo_image_surface_get_stride', [C.c_void_p], C.c_int),
            (self.cairo, 'cairo_image_surface_get_data', [C.c_void_p], C.c_void_p),
            (self.cairo, 'cairo_create', [C.c_void_p], C.c_void_p),
            (self.cairo, 'cairo_set_source_rgb', [C.c_void_p, C.c_double, C.c_double, C.c_double], None),
            (self.cairo, 'cairo_paint', [C.c_void_p], None),
            (self.cairo, 'cairo_save', [C.c_void_p], None),
            (self.cairo, 'cairo_restore', [C.c_void_p], None),
            (self.cairo, 'cairo_surface_flush', [C.c_void_p], None),
            (self.cairo, 'cairo_destroy', [C.c_void_p], None),
            (self.cairo, 'cairo_surface_destroy', [C.c_void_p], None),
            (self.gobject, 'g_object_unref', [C.c_void_p], None),
            (self.glib, 'g_error_free', [C.POINTER(GError)], None),
        ]
        for library, name, args, result in specs:
            fn = getattr(library, name)
            fn.argtypes, fn.restype = args, result

    def _error(self, error, fallback):
        if error:
            message = error.contents.message.decode('utf-8', errors='replace')
            self.glib.g_error_free(error)
            return RuntimeError(message)
        return RuntimeError(fallback)

    def render(self, svg: str) -> bytes:
        """Return opaque RGBA in row order. Validation belongs to the caller."""
        source = svg.encode('utf-8')
        data = C.create_string_buffer(source)
        error = C.POINTER(GError)()
        handle = self.rsvg.rsvg_handle_new_from_data(data, len(source), C.byref(error))
        if not handle:
            raise self._error(error, 'librsvg could not load frame')
        try:
            self.cairo.cairo_save(self.ctx)
            self.cairo.cairo_set_source_rgb(self.ctx, 1, 1, 1)
            self.cairo.cairo_paint(self.ctx)
            success = self.rsvg.rsvg_handle_render_document(handle, self.ctx, C.byref(self.viewport), C.byref(error))
            self.cairo.cairo_restore(self.ctx)
            if not success:
                raise self._error(error, 'librsvg could not rasterize frame')
            self.cairo.cairo_surface_flush(self.surface)
            raw = C.string_at(self.cairo.cairo_image_surface_get_data(self.surface), self.stride * self.height)
            channel_order = 'BGRA' if sys.byteorder == 'little' else 'ARGB'
            return Image.frombytes('RGBA', (self.width, self.height), raw, 'raw', channel_order, self.stride).tobytes()
        finally:
            self.gobject.g_object_unref(handle)

    def close(self):
        if self.ctx:
            self.cairo.cairo_destroy(self.ctx)
            self.cairo.cairo_surface_destroy(self.surface)
            self.ctx = self.surface = None

    def __enter__(self): return self
    def __exit__(self, *_): self.close()


def ctypes_library(name):
    path = ctypes.util.find_library(name)
    if not path:
        raise RuntimeError(f'Missing system library {name}; see README dependency instructions')
    return path
