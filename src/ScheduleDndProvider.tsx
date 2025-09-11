import { DndContext, Modifier, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { PropsWithChildren, useCallback } from "react";
import { CellSize, DAY_LABELS } from "./constants.ts";
import { useScheduleWrite } from "./ScheduleContext.tsx";

function createSnapModifier(): Modifier {
  return ({ transform, containerNodeRect, draggingNodeRect }) => {
    const containerTop = containerNodeRect?.top ?? 0;
    const containerLeft = containerNodeRect?.left ?? 0;
    const containerBottom = containerNodeRect?.bottom ?? 0;
    const containerRight = containerNodeRect?.right ?? 0;

    const { top = 0, left = 0, bottom = 0, right = 0 } = draggingNodeRect ?? {};

    const minX = containerLeft - left + 120 + 1;
    const minY = containerTop - top + 40 + 1;
    const maxX = containerRight - right;
    const maxY = containerBottom - bottom;

    return ({
      ...transform,
      x: Math.min(Math.max(Math.round(transform.x / CellSize.WIDTH) * CellSize.WIDTH, minX), maxX),
      y: Math.min(Math.max(Math.round(transform.y / CellSize.HEIGHT) * CellSize.HEIGHT, minY), maxY),
    })
  };
}

const modifiers = [createSnapModifier()]

interface Props extends PropsWithChildren {
  tableId: string;
}

export default function ScheduleDndProvider({ tableId, children }: Props) {
  // Context 격리: 쓰기 전용 Context만 사용
  const { updateSchedulePosition } = useScheduleWrite();
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDragEnd = useCallback((event: any) => {
    const { active, delta } = event;
    const { x, y } = delta;
    const [draggedTableId, index] = active.id.split(':');
    
    // 현재 테이블의 드래그만 처리
    if (draggedTableId !== tableId) {
      return;
    }
    
    const nowDayIndex = DAY_LABELS.indexOf(active.data.current?.day as typeof DAY_LABELS[number])
    const moveDayIndex = Math.floor(x / CellSize.WIDTH);
    const moveTimeIndex = Math.floor(y / CellSize.HEIGHT);
    const newDayIndex = nowDayIndex + moveDayIndex;
    
    // 유효한 범위 체크
    if (newDayIndex < 0 || newDayIndex >= DAY_LABELS.length) {
      return;
    }

    const newDay = DAY_LABELS[newDayIndex];
    const timeOffset = moveTimeIndex;

    // Context의 업데이트 함수 사용
    updateSchedulePosition(tableId, Number(index), newDay, timeOffset);
  }, [tableId, updateSchedulePosition]);

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd} modifiers={modifiers}>
      {children}
    </DndContext>
  );
}
