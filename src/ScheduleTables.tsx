import { Button, ButtonGroup, Flex, Heading, Stack } from "@chakra-ui/react";
import ScheduleTable from "./ScheduleTable.tsx";
import { useScheduleRead, useScheduleWrite } from "./ScheduleContext.tsx";
import SearchDialog from "./SearchDialog.tsx";
import ScheduleDndProvider from "./ScheduleDndProvider.tsx";
import { useState } from "react";

export const ScheduleTables = () => {
  // Context 격리: 읽기와 쓰기를 분리하여 필요한 부분만 구독
  const { schedulesMap } = useScheduleRead();
  const { duplicateTable, removeTable, removeSchedule } = useScheduleWrite();
  const [searchInfo, setSearchInfo] = useState<{
    tableId: string;
    day?: string;
    time?: number;
  } | null>(null);

  const disabledRemoveButton = Object.keys(schedulesMap).length === 1;

  const duplicate = (targetId: string) => {
    duplicateTable(targetId);
  };

  const remove = (targetId: string) => {
    removeTable(targetId);
  };

  return (
    <>
      <Flex w="full" gap={6} p={6} flexWrap="wrap">
        {Object.entries(schedulesMap).map(([tableId, schedules], index) => (
          <Stack key={tableId} width="600px">
            <Flex justifyContent="space-between" alignItems="center">
              <Heading as="h3" fontSize="lg">시간표 {index + 1}</Heading>
              <ButtonGroup size="sm" isAttached>
                <Button colorScheme="green" onClick={() => setSearchInfo({ tableId })}>시간표 추가</Button>
                <Button colorScheme="green" mx="1px" onClick={() => duplicate(tableId)}>복제</Button>
                <Button colorScheme="green" isDisabled={disabledRemoveButton}
                        onClick={() => remove(tableId)}>삭제</Button>
              </ButtonGroup>
            </Flex>
            {/* Context 격리: 각 시간표마다 독립적인 DndProvider 적용 */}
            <ScheduleDndProvider tableId={tableId}>
              <ScheduleTable
                key={`schedule-table-${index}`}
                schedules={schedules}
                tableId={tableId}
                onScheduleTimeClick={(timeInfo) => setSearchInfo({ tableId, ...timeInfo })}
                onDeleteButtonClick={({ day, time }) => removeSchedule(tableId, day, time)}
              />
            </ScheduleDndProvider>
          </Stack>
        ))}
      </Flex>
      <SearchDialog 
        isOpen={Boolean(searchInfo)}
        tableId={searchInfo?.tableId || ''}
        day={searchInfo?.day}
        time={searchInfo?.time}
        onClose={() => setSearchInfo(null)}
      />
    </>
  );
};
