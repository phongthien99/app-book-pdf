import { Box } from '@mui/material';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Layer, Line, Stage } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';

export type PdfDrawingTool = 'pen' | 'eraser';

export type PdfDrawingLine = {
  id: string;
  tool: PdfDrawingTool;
  color: string;
  strokeWidth: number;
  points: number[];
};

type Size = {
  width: number;
  height: number;
};

interface PdfDrawingLayerProps {
  children: ReactNode;
  color: string;
  lines: PdfDrawingLine[];
  onDrawStart?: (pageNumber: number) => void;
  onLinesChange: (updater: (lines: PdfDrawingLine[]) => PdfDrawingLine[]) => void;
  pageNumber: number;
  strokeWidth: number;
  tool: PdfDrawingTool | null;
}

const PEN_CURSOR = `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path d='M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z' fill='black' stroke='white' stroke-width='0.8'/></svg>") 3 21, crosshair`;

const ERASER_CURSOR = `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><rect x='3' y='9' width='18' height='11' rx='2' fill='%23ffcdd2' stroke='%23555' stroke-width='1.5'/><rect x='3' y='9' width='18' height='6' rx='2' fill='white' stroke='%23555' stroke-width='1.5'/><line x1='3' y1='15' x2='21' y2='15' stroke='%23555' stroke-width='1'/></svg>") 3 20, cell`;

function normalizePoint(size: Size, point: { x: number; y: number }) {
  return [point.x / size.width, point.y / size.height];
}

function denormalizePoints(size: Size, points: number[]) {
  const scaled: number[] = [];

  for (let index = 0; index < points.length; index += 2) {
    scaled.push((points[index] ?? 0) * size.width, (points[index + 1] ?? 0) * size.height);
  }

  return scaled;
}

export function PdfDrawingLayer({
  children,
  color,
  lines,
  onDrawStart,
  onLinesChange,
  pageNumber,
  strokeWidth,
  tool,
}: PdfDrawingLayerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const activeLineIdRef = useRef<string | null>(null);
  const [size, setSize] = useState<Size | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const updateSize = () => {
      const canvas = wrapper.querySelector('canvas');
      const rect = (canvas ?? wrapper).getBoundingClientRect();

      if (rect.width > 0 && rect.height > 0) {
        setSize({ width: Math.round(rect.width), height: Math.round(rect.height) });
      }
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(wrapper);

    return () => observer.disconnect();
  }, []);

  const finishLine = useCallback(() => {
    activeLineIdRef.current = null;
  }, []);

  const handleDrawStart = useCallback(
    (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!tool || !size) return;

      const stage = event.target.getStage();
      const pointerPosition = stage?.getPointerPosition();
      if (!pointerPosition) return;

      event.evt.preventDefault();

      const id = `${pageNumber}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      activeLineIdRef.current = id;
      const normalizedPoint = normalizePoint(size, pointerPosition);

      onDrawStart?.(pageNumber);
      onLinesChange((currentLines) => [
        ...currentLines,
        {
          id,
          tool,
          color,
          strokeWidth: strokeWidth / size.width,
          points: normalizedPoint,
        },
      ]);
    },
    [color, onDrawStart, onLinesChange, pageNumber, size, strokeWidth, tool],
  );

  const handleDrawMove = useCallback(
    (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!size || !activeLineIdRef.current) return;

      const stage = event.target.getStage();
      const pointerPosition = stage?.getPointerPosition();
      if (!pointerPosition) return;

      event.evt.preventDefault();
      const activeLineId = activeLineIdRef.current;
      const normalizedPoint = normalizePoint(size, pointerPosition);

      onLinesChange((currentLines) =>
        currentLines.map((line) =>
          line.id === activeLineId
            ? { ...line, points: [...line.points, ...normalizedPoint] }
            : line,
        ),
      );
    },
    [onLinesChange, size],
  );

  return (
    <Box ref={wrapperRef} sx={{ position: 'relative', display: 'inline-block', lineHeight: 0 }}>
      {children}

      {size && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            pointerEvents: tool ? 'auto' : 'none',
            touchAction: 'none',
            zIndex: 2,
            cursor: tool === 'eraser' ? ERASER_CURSOR : tool === 'pen' ? PEN_CURSOR : 'default',
          }}
        >
          <Stage
            width={size.width}
            height={size.height}
            onMouseDown={handleDrawStart}
            onMouseMove={handleDrawMove}
            onMouseUp={finishLine}
            onMouseLeave={finishLine}
            onTouchStart={handleDrawStart}
            onTouchMove={handleDrawMove}
            onTouchEnd={finishLine}
          >
            <Layer>
              {lines.map((line) => (
                <Line
                  key={line.id}
                  points={denormalizePoints(size, line.points)}
                  stroke={line.color}
                  strokeWidth={Math.max(1, line.strokeWidth * size.width)}
                  tension={0.35}
                  lineCap="round"
                  lineJoin="round"
                  globalCompositeOperation={
                    line.tool === 'eraser' ? 'destination-out' : 'source-over'
                  }
                />
              ))}
            </Layer>
          </Stage>
        </Box>
      )}
    </Box>
  );
}
