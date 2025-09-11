import {
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverTrigger,
  Text,
} from "@chakra-ui/react";
import { CellSize, DAY_LABELS, 분 } from "./constants.ts";
import { Schedule } from "./types.ts";
import { fill2, parseHnM } from "./utils.ts";
import { useDndContext, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ComponentProps, Fragment, memo, useMemo, useCallback } from "react";

interface Props {
  tableId: string;
  schedules: Schedule[];
  onScheduleTimeClick?: (timeInfo: { day: string, time: number }) => void;
  onDeleteButtonClick?: (timeInfo: { day: string, time: number }) => void;
}

const TIMES = [
  ...Array(18)
    .fill(0)
    .map((v, k) => v + k * 30 * 분)
    .map((v) => `${parseHnM(v)}~${parseHnM(v + 30 * 분)}`),

  ...Array(6)
    .fill(18 * 30 * 분)
    .map((v, k) => v + k * 55 * 분)
    .map((v) => `${parseHnM(v)}~${parseHnM(v + 50 * 분)}`),
] as const;

// 메모이제이션된 그리드 헤더 컴포넌트
const GridHeader = memo(() => (
  <>
    <GridItem key="교시" borderColor="gray.300" bg="gray.100">
      <Flex justifyContent="center" alignItems="center" h="full" w="full">
        <Text fontWeight="bold">교시</Text>
      </Flex>
    </GridItem>
    {DAY_LABELS.map((day) => (
      <GridItem key={day} borderLeft="1px" borderColor="gray.300" bg="gray.100">
        <Flex justifyContent="center" alignItems="center" h="full">
          <Text fontWeight="bold">{day}</Text>
        </Flex>
      </GridItem>
    ))}
  </>
));

// 메모이제이션된 시간 셀 컴포넌트
const TimeCell = memo(({ 
  time, 
  timeIndex, 
  onScheduleTimeClick 
}: {
  time: string;
  timeIndex: number;
  onScheduleTimeClick?: (timeInfo: { day: string, time: number }) => void;
}) => {
  const handleCellClick = useCallback((day: string) => {
    onScheduleTimeClick?.({ day, time: timeIndex + 1 });
  }, [onScheduleTimeClick, timeIndex]);

  return (
    <Fragment key={`시간-${timeIndex + 1}`}>
      <GridItem
        borderTop="1px solid"
        borderColor="gray.300"
        bg={timeIndex > 17 ? 'gray.200' : 'gray.100'}
      >
        <Flex justifyContent="center" alignItems="center" h="full">
          <Text fontSize="xs">{fill2(timeIndex + 1)} ({time})</Text>
        </Flex>
      </GridItem>
      {DAY_LABELS.map((day) => (
        <GridItem
          key={`${day}-${timeIndex + 2}`}
          borderWidth="1px 0 0 1px"
          borderColor="gray.300"
          bg={timeIndex > 17 ? 'gray.100' : 'white'}
          cursor="pointer"
          _hover={{ bg: 'yellow.100' }}
          onClick={() => handleCellClick(day)}
        />
      ))}
    </Fragment>
  );
});

const ScheduleTable = ({ tableId, schedules, onScheduleTimeClick, onDeleteButtonClick }: Props) => {
  // Computed Value 최적화: getColor 함수 메모이제이션
  const colorMap = useMemo(() => {
    const lectures = [...new Set(schedules.map(({ lecture }) => lecture.id))];
    const colors = ["#fdd", "#ffd", "#dff", "#ddf", "#fdf", "#dfd"];
    const map = new Map<string, string>();
    lectures.forEach((lectureId, index) => {
      map.set(lectureId, colors[index % colors.length]);
    });
    return map;
  }, [schedules]);

  const getColor = useCallback((lectureId: string): string => {
    return colorMap.get(lectureId) || "#fdd";
  }, [colorMap]);

  const dndContext = useDndContext();

  // 활성 테이블 ID 메모이제이션
  const activeTableId = useMemo(() => {
    const activeId = dndContext.active?.id;
    if (activeId) {
      return String(activeId).split(":")[0];
    }
    return null;
  }, [dndContext.active?.id]);

  // 드래그 중인 스케줄 인덱스 메모이제이션
  const draggingScheduleIndex = useMemo(() => {
    const activeId = dndContext.active?.id;
    if (activeId && String(activeId).startsWith(tableId)) {
      return parseInt(String(activeId).split(":")[1]);
    }
    return null;
  }, [dndContext.active?.id, tableId]);

  return (
    <Box
      position="relative"
      outline={activeTableId === tableId ? "5px dashed" : undefined}
      outlineColor="blue.300"
    >
      <Grid
        templateColumns={`120px repeat(${DAY_LABELS.length}, ${CellSize.WIDTH}px)`}
        templateRows={`40px repeat(${TIMES.length}, ${CellSize.HEIGHT}px)`}
        bg="white"
        fontSize="sm"
        textAlign="center"
        outline="1px solid"
        outlineColor="gray.300"
      >
        <GridHeader />
        {TIMES.map((time, timeIndex) => (
          <TimeCell
            key={timeIndex}
            time={time}
            timeIndex={timeIndex}
            onScheduleTimeClick={onScheduleTimeClick}
          />
        ))}
      </Grid>

      {schedules.map((schedule, index) => (
        <DraggableSchedule
          key={`${schedule.lecture.title}-${index}`}
          id={`${tableId}:${index}`}
          data={schedule}
          bg={getColor(schedule.lecture.id)}
          onDeleteButtonClick={() => onDeleteButtonClick?.({
            day: schedule.day,
            time: schedule.range[0],
          })}
          isDragging={draggingScheduleIndex === index}
        />
      ))}
    </Box>
  );
};

// React.memo로 최적화된 드래그 가능한 스케줄 컴포넌트
const DraggableSchedule = memo(({
  id,
  data,
  bg,
  onDeleteButtonClick,
  isDragging
}: { 
  id: string; 
  data: Schedule;
  isDragging: boolean;
  onDeleteButtonClick: () => void;
} & ComponentProps<typeof Box>) => {
  const { day, range, room, lecture } = data;
  const { attributes, setNodeRef, listeners, transform } = useDraggable({ 
    id,
    data: { day, range, lecture }
  });
  
  // 위치 계산 메모이제이션
  const position = useMemo(() => {
    const leftIndex = DAY_LABELS.indexOf(day as typeof DAY_LABELS[number]);
    const topIndex = range[0] - 1;
    const size = range.length;
    
    return {
      left: `${120 + (CellSize.WIDTH * leftIndex) + 1}px`,
      top: `${40 + (topIndex * CellSize.HEIGHT + 1)}px`,
      width: (CellSize.WIDTH - 1) + "px",
      height: (CellSize.HEIGHT * size - 1) + "px"
    };
  }, [day, range]);

  return (
    <Popover>
      <PopoverTrigger>
        <Box
          position="absolute"
          {...position}
          bg={bg}
          p={1}
          boxSizing="border-box"
          cursor="pointer"
          ref={setNodeRef}
          transform={CSS.Translate.toString(transform)}
          opacity={isDragging ? 0.5 : 1}
          zIndex={isDragging ? 1000 : 1}
          {...listeners}
          {...attributes}
        >
          <Text fontSize="sm" fontWeight="bold">{lecture.title}</Text>
          <Text fontSize="xs">{room}</Text>
        </Box>
      </PopoverTrigger>
      <PopoverContent onClick={event => event.stopPropagation()}>
        <PopoverArrow/>
        <PopoverCloseButton/>
        <PopoverBody>
          <Text>강의를 삭제하시겠습니까?</Text>
          <Button colorScheme="red" size="xs" onClick={onDeleteButtonClick}>
            삭제
          </Button>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}, (prevProps, nextProps) => {
  // 정밀한 비교로 불필요한 리렌더링 방지
  return prevProps.id === nextProps.id &&
         prevProps.data === nextProps.data &&
         prevProps.bg === nextProps.bg &&
         prevProps.isDragging === nextProps.isDragging;
});

export default ScheduleTable;
