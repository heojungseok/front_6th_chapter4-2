import React, { createContext, PropsWithChildren, useContext, useState, useMemo } from "react";
import { Schedule } from "./types.ts";
import dummyScheduleMap from "./dummyScheduleMap.ts";

// 읽기 전용 Context - 데이터만 제공
interface ScheduleReadContextType {
  schedulesMap: Record<string, Schedule[]>;
}

// 쓰기 전용 Context - 액션만 제공
interface ScheduleWriteContextType {
  setSchedulesMap: React.Dispatch<React.SetStateAction<Record<string, Schedule[]>>>;
  addSchedule: (tableId: string, schedules: Schedule[]) => void;
  removeSchedule: (tableId: string, day: string, time: number) => void;
  duplicateTable: (tableId: string) => void;
  removeTable: (tableId: string) => void;
  updateSchedulePosition: (tableId: string, scheduleIndex: number, newDay: string, timeOffset: number) => void;
}

const ScheduleReadContext = createContext<ScheduleReadContextType | undefined>(undefined);
const ScheduleWriteContext = createContext<ScheduleWriteContextType | undefined>(undefined);

// 읽기 전용 hook
export const useScheduleRead = () => {
  const context = useContext(ScheduleReadContext);
  if (context === undefined) {
    throw new Error('useScheduleRead must be used within a ScheduleProvider');
  }
  return context;
};

// 쓰기 전용 hook
export const useScheduleWrite = () => {
  const context = useContext(ScheduleWriteContext);
  if (context === undefined) {
    throw new Error('useScheduleWrite must be used within a ScheduleProvider');
  }
  return context;
};

// 기존 hook (하위 호환성 유지)
export const useScheduleContext = () => {
  const read = useScheduleRead();
  const write = useScheduleWrite();
  return { ...read, ...write };
};

export const ScheduleProvider = ({ children }: PropsWithChildren) => {
  const [schedulesMap, setSchedulesMap] = useState<Record<string, Schedule[]>>(dummyScheduleMap);

  // 읽기 전용 값 - 메모이제이션으로 불필요한 리렌더링 방지
  const readValue = useMemo(() => ({ 
    schedulesMap 
  }), [schedulesMap]);

  // 쓰기 전용 값 - 함수들은 변경되지 않으므로 메모이제이션
  const writeValue = useMemo(() => ({
    setSchedulesMap,
    addSchedule: (tableId: string, schedules: Schedule[]) => {
      setSchedulesMap(prev => ({
        ...prev,
        [tableId]: [...prev[tableId], ...schedules]
      }));
    },
    removeSchedule: (tableId: string, day: string, time: number) => {
      setSchedulesMap(prev => ({
        ...prev,
        [tableId]: prev[tableId].filter(schedule => 
          schedule.day !== day || !schedule.range.includes(time)
        )
      }));
    },
    duplicateTable: (tableId: string) => {
      setSchedulesMap(prev => {
        const newTableId = `schedule-${Date.now()}`;
        return {
          ...prev,
          [newTableId]: [...prev[tableId]]
        };
      });
    },
    removeTable: (tableId: string) => {
      setSchedulesMap(prev => {
        const { [tableId]: removed, ...rest } = prev;
        return rest;
      });
    },
    updateSchedulePosition: (tableId: string, scheduleIndex: number, newDay: string, timeOffset: number) => {
      setSchedulesMap(prev => ({
        ...prev,
        [tableId]: prev[tableId].map((schedule, index) => {
          if (index !== scheduleIndex) {
            return schedule;
          }
          return {
            ...schedule,
            day: newDay,
            range: schedule.range.map(time => time + timeOffset),
          };
        })
      }));
    }
  }), [setSchedulesMap]);

  return (
    <ScheduleReadContext.Provider value={readValue}>
      <ScheduleWriteContext.Provider value={writeValue}>
        {children}
      </ScheduleWriteContext.Provider>
    </ScheduleReadContext.Provider>
  );
};
