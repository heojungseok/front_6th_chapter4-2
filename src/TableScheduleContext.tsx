import React, { createContext, useContext, useState, useMemo, useCallback, PropsWithChildren } from "react";
import { Schedule } from "./types.ts";

interface TableScheduleContextType {
  schedules: Schedule[];
  addSchedules: (newSchedules: Schedule[]) => void;
  removeSchedule: (day: string, time: number) => void;
  updateSchedulePosition: (scheduleIndex: number, newDay: string, timeOffset: number) => void;
}

const TableScheduleContext = createContext<TableScheduleContextType | undefined>(undefined);

export const useTableSchedule = () => {
  const context = useContext(TableScheduleContext);
  if (context === undefined) {
    throw new Error('useTableSchedule must be used within a TableScheduleProvider');
  }
  return context;
};

interface Props extends PropsWithChildren {
  initialSchedules: Schedule[];
  onSchedulesChange: (schedules: Schedule[]) => void;
}

export const TableScheduleProvider = ({ 
  children, 
  initialSchedules, 
  onSchedulesChange 
}: Props) => {
  const [schedules, setSchedules] = useState<Schedule[]>(initialSchedules);

  // 상위 컴포넌트에 변경사항 알림
  const notifyChange = useCallback((newSchedules: Schedule[]) => {
    setSchedules(newSchedules);
    onSchedulesChange(newSchedules);
  }, [onSchedulesChange]);

  // 메모이제이션된 액션 함수들
  const value = useMemo(() => ({
    schedules,
    addSchedules: (newSchedules: Schedule[]) => {
      const updatedSchedules = [...schedules, ...newSchedules];
      notifyChange(updatedSchedules);
    },
    removeSchedule: (day: string, time: number) => {
      const updatedSchedules = schedules.filter(schedule => 
        schedule.day !== day || !schedule.range.includes(time)
      );
      notifyChange(updatedSchedules);
    },
    updateSchedulePosition: (scheduleIndex: number, newDay: string, timeOffset: number) => {
      const updatedSchedules = schedules.map((schedule, index) => {
        if (index !== scheduleIndex) {
          return schedule;
        }
        return {
          ...schedule,
          day: newDay,
          range: schedule.range.map(time => time + timeOffset),
        };
      });
      notifyChange(updatedSchedules);
    }
  }), [schedules, notifyChange]);

  return (
    <TableScheduleContext.Provider value={value}>
      {children}
    </TableScheduleContext.Provider>
  );
};
