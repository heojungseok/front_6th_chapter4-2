import { useEffect, useRef, useState, useMemo, useCallback, memo } from "react";
import {
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Select,
  Stack,
  Table,
  Tag,
  TagCloseButton,
  TagLabel,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
  Wrap,
} from "@chakra-ui/react";
import { useScheduleWrite } from "./ScheduleContext.tsx";  // 쓰기 전용 Context만 사용
import { Lecture } from "./types.ts";
import { parseSchedule } from "./utils.ts";
import axios from "axios";
import { DAY_LABELS } from "./constants.ts";

// Props 최적화: Reference Value → Primitive Value 변경
interface Props {
  isOpen: boolean;
  tableId: string;
  day?: string;
  time?: number;
  onClose: () => void;
}

interface SearchOption {
  query?: string,
  grades: number[],
  days: string[],
  times: number[],
  majors: string[],
  credits?: number,
}

const TIME_SLOTS = [
  { id: 1, label: "09:00~09:30" },
  { id: 2, label: "09:30~10:00" },
  { id: 3, label: "10:00~10:30" },
  { id: 4, label: "10:30~11:00" },
  { id: 5, label: "11:00~11:30" },
  { id: 6, label: "11:30~12:00" },
  { id: 7, label: "12:00~12:30" },
  { id: 8, label: "12:30~13:00" },
  { id: 9, label: "13:00~13:30" },
  { id: 10, label: "13:30~14:00" },
  { id: 11, label: "14:00~14:30" },
  { id: 12, label: "14:30~15:00" },
  { id: 13, label: "15:00~15:30" },
  { id: 14, label: "15:30~16:00" },
  { id: 15, label: "16:00~16:30" },
  { id: 16, label: "16:30~17:00" },
  { id: 17, label: "17:00~17:30" },
  { id: 18, label: "17:30~18:00" },
  { id: 19, label: "18:00~18:50" },
  { id: 20, label: "18:55~19:45" },
  { id: 21, label: "19:50~20:40" },
  { id: 22, label: "20:45~21:35" },
  { id: 23, label: "21:40~22:30" },
  { id: 24, label: "22:35~23:25" },
];

const PAGE_SIZE = 100;

// 전역 캐시 - window 객체에 저장하여 모듈 재로드에도 유지
declare global {
  interface Window {
    lectureApiCache?: Map<string, { 
      promise: Promise<any>, 
      timestamp: number,
      data?: any 
    }>;
  }
}

// 캐시 초기화
if (typeof window !== 'undefined' && !window.lectureApiCache) {
  window.lectureApiCache = new Map();
}

const getCache = () => window.lectureApiCache || new Map();

const fetchMajors = () => {
  const cache = getCache();
  const cacheKey = 'schedules-majors';
  
  // 캐시 확인
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached.promise;
  }
  
  const promise = axios.get<Lecture[]>('/schedules-majors.json');
  
  // 캐시에 저장
  cache.set(cacheKey, { 
    promise, 
    timestamp: performance.now() 
  });
  
  // 완료 후 데이터도 저장
  promise.then(data => {
    const entry = cache.get(cacheKey);
    if (entry) {
      entry.data = data;
    }
  });
  
  return promise;
};

const fetchLiberalArts = () => {
  const cache = getCache();
  const cacheKey = 'schedules-liberal-arts';
  
  // 캐시 확인
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached.promise;
  }
  
  const promise = axios.get<Lecture[]>('/schedules-liberal-arts.json');
  
  // 캐시에 저장
  cache.set(cacheKey, { 
    promise, 
    timestamp: performance.now() 
  });
  
  // 완료 후 데이터도 저장
  promise.then(data => {
    const entry = cache.get(cacheKey);
    if (entry) {
      entry.data = data;
    }
  });
  
  return promise;
};

// 6번 API 호출을 유지하되 캐싱으로 처리
const fetchAllLectures = async () => {
  console.log('=== fetchAllLectures 시작 ===');
  const results = await Promise.all([
    (console.log('API Call 1', performance.now()), await fetchMajors()),
    (console.log('API Call 2', performance.now()), await fetchLiberalArts()),
    (console.log('API Call 3', performance.now()), await fetchMajors()),
    (console.log('API Call 4', performance.now()), await fetchLiberalArts()),
    (console.log('API Call 5', performance.now()), await fetchMajors()),
    (console.log('API Call 6', performance.now()), await fetchLiberalArts()),
  ]);
  console.log('=== fetchAllLectures 완료 ===');
  
  // 캐시 상태 출력
  const cache = getCache();
  console.log('캐시 상태:', {
    'schedules-majors': cache.has('schedules-majors') ? '캐시됨' : '없음',
    'schedules-liberal-arts': cache.has('schedules-liberal-arts') ? '캐시됨' : '없음',
    'total cache size': cache.size
  });
  
  return results;
};

// React.memo로 최적화된 개별 컴포넌트들
const SearchInput = memo(({ value, onChange }: { value: string, onChange: (value: string) => void }) => (
  <FormControl>
    <FormLabel>검색어</FormLabel>
    <Input
      placeholder="과목명 또는 과목코드"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </FormControl>
), (prevProps, nextProps) => prevProps.value === nextProps.value);

const CreditsSelect = memo(({ value, onChange }: { value?: number, onChange: (value: string) => void }) => (
  <FormControl>
    <FormLabel>학점</FormLabel>
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">전체</option>
      <option value="1">1학점</option>
      <option value="2">2학점</option>
      <option value="3">3학점</option>
    </Select>
  </FormControl>
), (prevProps, nextProps) => prevProps.value === nextProps.value);

const GradeCheckboxGroup = memo(({ grades, onChange }: { grades: number[], onChange: (grades: number[]) => void }) => (
  <FormControl>
    <FormLabel>학년</FormLabel>
    <CheckboxGroup
      value={grades}
      onChange={(value) => onChange(value.map(Number))}
    >
      <HStack spacing={4}>
        {[1, 2, 3, 4].map(grade => (
          <Checkbox key={grade} value={grade}>{grade}학년</Checkbox>
        ))}
      </HStack>
    </CheckboxGroup>
  </FormControl>
), (prevProps, nextProps) => 
  prevProps.grades.length === nextProps.grades.length &&
  prevProps.grades.every((grade, index) => grade === nextProps.grades[index])
);

const DayCheckboxGroup = memo(({ days, onChange }: { days: string[], onChange: (days: string[]) => void }) => (
  <FormControl>
    <FormLabel>요일</FormLabel>
    <CheckboxGroup
      value={days}
      onChange={(value) => onChange(value as string[])}
    >
      <HStack spacing={4}>
        {DAY_LABELS.map(day => (
          <Checkbox key={day} value={day}>{day}</Checkbox>
        ))}
      </HStack>
    </CheckboxGroup>
  </FormControl>
), (prevProps, nextProps) => 
  prevProps.days.length === nextProps.days.length &&
  prevProps.days.every((day, index) => day === nextProps.days[index])
);

const TimeCheckboxGroup = memo(({ times, onChange }: { times: number[], onChange: (times: number[]) => void }) => (
  <FormControl>
    <FormLabel>시간</FormLabel>
    <CheckboxGroup
      colorScheme="green"
      value={times}
      onChange={(values) => onChange(values.map(Number))}
    >
      <Wrap spacing={1} mb={2}>
        {times.sort((a, b) => a - b).map(time => (
          <Tag key={time} size="sm" variant="outline" colorScheme="blue">
            <TagLabel>{time}교시</TagLabel>
            <TagCloseButton
              onClick={() => onChange(times.filter(v => v !== time))}/>
          </Tag>
        ))}
      </Wrap>
      <Stack spacing={2} overflowY="auto" h="100px" border="1px solid" borderColor="gray.200"
             borderRadius={5} p={2}>
        {TIME_SLOTS.map(({ id, label }) => (
          <Box key={id}>
            <Checkbox key={id} size="sm" value={id}>
              {id}교시({label})
            </Checkbox>
          </Box>
        ))}
      </Stack>
    </CheckboxGroup>
  </FormControl>
), (prevProps, nextProps) => 
  prevProps.times.length === nextProps.times.length &&
  prevProps.times.every((time, index) => time === nextProps.times[index])
);

const MajorCheckboxGroup = memo(({ majors, allMajors, onChange }: { majors: string[], allMajors: string[], onChange: (majors: string[]) => void }) => (
  <FormControl>
    <FormLabel>전공</FormLabel>
    <CheckboxGroup
      colorScheme="green"
      value={majors}
      onChange={(values) => onChange(values as string[])}
    >
      <Wrap spacing={1} mb={2}>
        {majors.map(major => (
          <Tag key={major} size="sm" variant="outline" colorScheme="blue">
            <TagLabel>{major.split("<p>").pop()}</TagLabel>
            <TagCloseButton
              onClick={() => onChange(majors.filter(v => v !== major))}/>
          </Tag>
        ))}
      </Wrap>
      <Stack spacing={2} overflowY="auto" h="100px" border="1px solid" borderColor="gray.200"
             borderRadius={5} p={2}>
        {allMajors.map(major => (
          <Box key={major}>
            <Checkbox key={major} size="sm" value={major}>
              {major.replace(/<p>/gi, ' ')}
            </Checkbox>
          </Box>
        ))}
      </Stack>
    </CheckboxGroup>
  </FormControl>
), (prevProps, nextProps) => 
  prevProps.majors.length === nextProps.majors.length &&
  prevProps.majors.every((major, index) => major === nextProps.majors[index]) &&
  prevProps.allMajors.length === nextProps.allMajors.length
);

const LectureRow = memo(({ lecture, index, onAddSchedule }: { 
  lecture: Lecture, 
  index: number, 
  onAddSchedule: (lecture: Lecture) => void 
}) => (
  <Tr key={`${lecture.id}-${index}`}>
    <Td width="100px">{lecture.id}</Td>
    <Td width="50px">{lecture.grade}</Td>
    <Td width="200px">{lecture.title}</Td>
    <Td width="50px">{lecture.credits}</Td>
    <Td width="150px" dangerouslySetInnerHTML={{ __html: lecture.major }}/>
    <Td width="150px" dangerouslySetInnerHTML={{ __html: lecture.schedule }}/>
    <Td width="80px">
      <Button size="sm" colorScheme="green" onClick={() => onAddSchedule(lecture)}>추가</Button>
    </Td>
  </Tr>
), (prevProps, nextProps) => 
  prevProps.lecture.id === nextProps.lecture.id &&
  prevProps.index === nextProps.index
);

const SearchDialog = ({ isOpen, tableId, day, time, onClose }: Props) => {
  // Context 격리: 쓰기 전용 Context만 사용하여 불필요한 리렌더링 방지
  const { addSchedule: addScheduleToContext } = useScheduleWrite();

  const loaderWrapperRef = useRef<HTMLDivElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [page, setPage] = useState(1);
  const [searchOptions, setSearchOptions] = useState<SearchOption>({
    query: '',
    grades: [],
    days: [],
    times: [],
    majors: [],
  });

  // Computed Value 최적화: useMemo로 메모이제이션
  const filteredLectures = useMemo(() => {
    const { query = '', credits, grades, days, times, majors } = searchOptions;
    return lectures
      .filter(lecture =>
        lecture.title.toLowerCase().includes(query.toLowerCase()) ||
        lecture.id.toLowerCase().includes(query.toLowerCase())
      )
      .filter(lecture => grades.length === 0 || grades.includes(lecture.grade))
      .filter(lecture => majors.length === 0 || majors.includes(lecture.major))
      .filter(lecture => !credits || lecture.credits.startsWith(String(credits)))
      .filter(lecture => {
        if (days.length === 0) {
          return true;
        }
        const schedules = lecture.schedule ? parseSchedule(lecture.schedule) : [];
        return schedules.some(s => days.includes(s.day));
      })
      .filter(lecture => {
        if (times.length === 0) {
          return true;
        }
        const schedules = lecture.schedule ? parseSchedule(lecture.schedule) : [];
        return schedules.some(s => s.range.some(time => times.includes(time)));
      });
  }, [lectures, searchOptions]);

  const lastPage = useMemo(() => Math.ceil(filteredLectures.length / PAGE_SIZE), [filteredLectures.length]);
  const visibleLectures = useMemo(() => filteredLectures.slice(0, page * PAGE_SIZE), [filteredLectures, page]);
  const allMajors = useMemo(() => [...new Set(lectures.map(lecture => lecture.major))], [lectures]);

  // useCallback으로 함수 최적화
  const changeSearchOption = useCallback((field: keyof SearchOption, value: SearchOption[typeof field]) => {
    setPage(1);
    setSearchOptions(prev => ({ ...prev, [field]: value }));
    loaderWrapperRef.current?.scrollTo(0, 0);
  }, []);

  const addSchedule = useCallback((lecture: Lecture) => {
    const schedules = parseSchedule(lecture.schedule).map(schedule => ({
      ...schedule,
      lecture
    }));

    // Context 격리된 함수 사용
    addScheduleToContext(tableId, schedules);
    onClose();
  }, [tableId, addScheduleToContext, onClose]);

  // 개별 핸들러들을 useCallback으로 최적화
  const handleQueryChange = useCallback((value: string) => changeSearchOption('query', value), [changeSearchOption]);
  const handleCreditsChange = useCallback((value: string) => changeSearchOption('credits', value), [changeSearchOption]);
  const handleGradesChange = useCallback((grades: number[]) => changeSearchOption('grades', grades), [changeSearchOption]);
  const handleDaysChange = useCallback((days: string[]) => changeSearchOption('days', days), [changeSearchOption]);
  const handleTimesChange = useCallback((times: number[]) => changeSearchOption('times', times), [changeSearchOption]);
  const handleMajorsChange = useCallback((majors: string[]) => changeSearchOption('majors', majors), [changeSearchOption]);

  useEffect(() => {
    const start = performance.now();
    console.log('API 호출 시작: ', start)
    fetchAllLectures().then(results => {
      const end = performance.now();
      console.log('모든 API 호출 완료 ', end)
      console.log('API 호출에 걸린 시간(ms): ', end - start)
      setLectures(results.flatMap(result => result.data));
    })
  }, []);

  useEffect(() => {
    const $loader = loaderRef.current;
    const $loaderWrapper = loaderWrapperRef.current;

    if (!$loader || !$loaderWrapper) {
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setPage(prevPage => Math.min(lastPage, prevPage + 1));
        }
      },
      { threshold: 0, root: $loaderWrapper }
    );

    observer.observe($loader);

    return () => observer.unobserve($loader);
  }, [lastPage]);

  useEffect(() => {
    setSearchOptions(prev => ({
      ...prev,
      days: day ? [day] : [],
      times: time ? [time] : [],
    }))
    setPage(1);
  }, [day, time]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl">
      <ModalOverlay/>
      <ModalContent maxW="90vw" w="1000px">
        <ModalHeader>수업 검색</ModalHeader>
        <ModalCloseButton/>
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <HStack spacing={4}>
              <SearchInput value={searchOptions.query || ''} onChange={handleQueryChange} />
              <CreditsSelect value={searchOptions.credits} onChange={handleCreditsChange} />
            </HStack>

            <HStack spacing={4}>
              <GradeCheckboxGroup grades={searchOptions.grades} onChange={handleGradesChange} />
              <DayCheckboxGroup days={searchOptions.days} onChange={handleDaysChange} />
            </HStack>

            <HStack spacing={4}>
              <TimeCheckboxGroup times={searchOptions.times} onChange={handleTimesChange} />
              <MajorCheckboxGroup 
                majors={searchOptions.majors} 
                allMajors={allMajors} 
                onChange={handleMajorsChange} 
              />
            </HStack>
            
            <Text align="right">
              검색결과: {filteredLectures.length}개
            </Text>
            
            <Box>
              <Table>
                <Thead>
                  <Tr>
                    <Th width="100px">과목코드</Th>
                    <Th width="50px">학년</Th>
                    <Th width="200px">과목명</Th>
                    <Th width="50px">학점</Th>
                    <Th width="150px">전공</Th>
                    <Th width="150px">시간</Th>
                    <Th width="80px"></Th>
                  </Tr>
                </Thead>
              </Table>

              <Box overflowY="auto" maxH="500px" ref={loaderWrapperRef}>
                <Table size="sm" variant="striped">
                  <Tbody>
                    {visibleLectures.map((lecture, index) => (
                      <LectureRow 
                        key={`${lecture.id}-${index}`}
                        lecture={lecture}
                        index={index}
                        onAddSchedule={addSchedule}
                      />
                    ))}
                  </Tbody>
                </Table>
                <Box ref={loaderRef} h="20px"/>
              </Box>
            </Box>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

// React.memo로 메인 컴포넌트 최적화
export default memo(SearchDialog, (prevProps, nextProps) => {
  return prevProps.isOpen === nextProps.isOpen &&
         prevProps.tableId === nextProps.tableId &&
         prevProps.day === nextProps.day &&
         prevProps.time === nextProps.time;
});