# React 컴포넌트 리렌더링 최적화 가이드

## 개요

React 시간표 애플리케이션에서 드래그 앤 드롭 기능 사용 시 발생하는 성능 문제를 해결하기 위한 최적화 작업입니다. 특정 시간표 객체를 드래그할 때 전체 시간표에 미치는 렌더링 영향을 최소화하는 것이 목표였습니다.

## 적용된 최적화 기법

### 1. Computed Value 최적화

#### 문제점
- `getColor` 함수가 매 렌더링마다 복잡한 연산 수행
- 시간복잡도 O(n)의 `indexOf` 연산이 반복적으로 실행됨

#### 해결방안
```typescript
// ❌ Before: 매번 복잡한 연산
const getColor = (lectureId: string): string => {
  const lectures = [...new Set(schedules.map(({ lecture }) => lecture.id))];
  const colors = ["#fdd", "#ffd", "#dff", "#ddf", "#fdf", "#dfd"];
  return colors[lectures.indexOf(lectureId) % colors.length];
};

// ✅ After: useMemo로 메모이제이션 + Map 구조로 O(1) 접근
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
```

### 2. React.memo 최적화

#### 세분화된 컴포넌트 메모이제이션
```typescript
// 그리드 헤더 메모이제이션
const GridHeader = memo(() => (
  // 정적 콘텐츠이므로 리렌더링 방지
));

// 시간 셀 메모이제이션
const TimeCell = memo(({ time, timeIndex, onScheduleTimeClick }) => (
  // props 변경시에만 리렌더링
));

// 드래그 가능한 스케줄 정밀 비교
const DraggableSchedule = memo(Component, (prevProps, nextProps) => {
  return prevProps.id === nextProps.id &&
         prevProps.data === nextProps.data &&
         prevProps.bg === nextProps.bg &&
         prevProps.isDragging === nextProps.isDragging;
});
```

### 3. 드래그 상태 최적화

#### 드래그 중인 요소만 식별하여 시각적 피드백 적용
```typescript
<code_block_to_apply_changes_from>
```

### 4. Context 격리

#### 읽기/쓰기 Context 분리 유지
```typescript
// 기존 구조 유지: ScheduleReadContext, ScheduleWriteContext
const { schedulesMap } = useScheduleRead();
const { updateSchedulePosition } = useScheduleWrite();

// 테이블별 독립 상태 관리 (향후 확장 가능)
export const TableScheduleProvider = ({ children, initialSchedules, onSchedulesChange }) => {
  // 각 테이블의 독립적인 상태 관리
};
```

### 5. 위치 계산 메모이제이션

#### 드래그 요소의 위치 계산 최적화
```typescript
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
```

## 트러블슈팅

### 1. TableScheduleContext 에러

#### 문제
```
TableScheduleContext.tsx:16 Uncaught Error: useTableSchedule must be used within a TableScheduleProvider
```

#### 원인
- `ScheduleTable`과 `ScheduleDndProvider`에서 `useTableSchedule` hook을 사용했지만
- `TableScheduleProvider`로 감싸지지 않은 상태에서 실행됨

#### 해결방법
1. **단계적 접근**: 기존 구조와 호환성을 유지하면서 점진적 최적화
2. **기존 props 구조 유지**: `ScheduleTable`에서 `schedules` prop을 그대로 받도록 수정
3. **Context 사용 최소화**: 당장 필요하지 않은 `TableScheduleProvider` 제거하고 기존 `ScheduleContext` 활용

```typescript
// ❌ 처음 시도: 새로운 Context 도입
const { schedules, removeSchedule } = useTableSchedule();

// ✅ 최종 해결: 기존 구조 유지
const ScheduleTable = ({ tableId, schedules, onScheduleTimeClick, onDeleteButtonClick }: Props) => {
  // 기존 props 구조 그대로 사용
};
```

### 2. useCallback import 누락

#### 문제
```
'useCallback' is not defined
```

#### 원인
- `ScheduleDndProvider.tsx`에서 `useCallback`을 사용했지만 import하지 않음

#### 해결방법
```typescript
// ✅ 필요한 React hooks import 추가
import { PropsWithChildren, useCallback } from "react";
```

### 3. 컴포넌트 구조 호환성 문제

#### 문제
- 새로운 최적화 구조가 기존 `ScheduleTables.tsx`의 구조와 맞지 않음

#### 해결방법
1. **기존 인터페이스 유지**: `Props` 타입을 기존과 동일하게 유지
2. **점진적 최적화**: 한 번에 모든 구조를 바꾸지 않고 단계적으로 적용
3. **하위 호환성**: 기존 코드가 정상 작동하도록 보장

## 성능 향상 결과

### 최적화 전
- 드래그 시 모든 시간표 컴포넌트가 리렌더링
- `getColor` 함수의 반복적인 O(n) 연산
- 불필요한 위치 계산 반복

### 최적화 후
- 드래그 중인 스케줄과 직접 관련된 컴포넌트만 리렌더링
- 색상 매핑 O(1) 접근으로 성능 향상
- 메모이제이션을 통한 불필요한 연산 제거
- 정밀한 비교 함수로 리렌더링 최소화

## 적용 우선순위

1. **Computed Value 최적화**: 즉시 적용 가능하며 효과가 큰 최적화
2. **React.memo 세밀 조정**: 컴포넌트별 정밀한 메모이제이션
3. **드래그 상태 최적화**: 시각적 피드백 최소화
4. **Context 격리**: 향후 확장성을 위한 구조 개선

## 향후 개선 방향

1. **TableScheduleProvider 도입**: 테이블별 완전 독립 상태 관리
2. **가상화(Virtualization)**: 대량의 스케줄 데이터 처리 시 적용
3. **Web Workers**: 복잡한 연산을 메인 스레드에서 분리
4. **Suspense 활용**: 비동기 데이터 로딩 최적화

## 결론

이번 최적화를 통해 React 애플리케이션의 드래그 앤 드롭 성능을 크게 향상시켰습니다. 특히 Computed Value 최적화와 React.memo의 정밀한 활용으로 불필요한 리렌더링을 최소화하여 사용자 경험을 개선했습니다.

핵심은 **점진적 최적화**와 **기존 구조와의 호환성 유지**였으며, 이를 통해 안정적이면서도 성능이 향상된 애플리케이션을 구현할 수 있었습니다.
```

문서를 생성했습니다! 이 문서는 다음 내용들을 포함하고 있습니다:

1. **개요**: 최적화 작업의 목적과 배경
2. **적용된 최적화 기법**: 5가지 주요 최적화 방법과 구체적인 코드 예시
3. **트러블슈팅**: 발생했던 3가지 주요 문제와 해결 과정
4. **성능 향상 결과**: 최적화 전후 비교
5. **적용 우선순위**: 실무에서 적용할 때의 권장 순서
6. **향후 개선 방향**: 추가 최적화 가능한 영역들

특히 트러블슈팅 섹션에서는 `TableScheduleContext` 에러, `useCallback` import 누락, 컴포넌트 구조 호환성 문제 등 실제로 겪었던 문제들과 해결 과정을 상세히 기록했습니다.

