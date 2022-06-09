import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { forkJoin, of } from 'rxjs';
import { AjaxError } from 'rxjs/ajax';
import {
  catchError,
  debounceTime,
  filter,
  map,
  mapTo,
  mergeMap,
  mergeMapTo,
  switchMap,
  timeout,
  withLatestFrom
} from 'rxjs/operators';
import { AppEpic } from '../../../app/store';
import { authLogout } from '../../auth/auth-slice';
import {
  AlgorithmTypes,
  DfgRequest,
  ViewDraft,
  FuzzyRequest,
  Graph,
  GraphMetrics,
  GraphNodeEdgeMetrics,
  GraphValues,
  NodeEdgeId,
  GraphParameters
} from '../../../models/graph';
import { GRAPH_EDGE_MAX_WIDTH, GRAPH_EDGE_MIN_WIDTH } from '../../../app/config';
import {
  postDfg,
  postViewDraft,
  postFuzzy,
  postDraft,
  getDraftParams,
  patchDraftParameter
} from '../../../api/graph-api';

interface GraphState {
  isLoading: boolean;
  error: string;
  viewId: string;
  draft: ViewDraft;
  graph: Graph;
  dfgFilters: DfgRequest;
  fuzzyFilters: FuzzyRequest;
  userParams: GraphParameters[];
  algorithmType: AlgorithmTypes;
  graphMetrics: GraphMetrics;
  nodeEdgeMetrics: GraphNodeEdgeMetrics;
  isSidebar: boolean;
  graphSidebarTabIndex: number;
  width: EdgeWidth;
  graphValue: GraphValues;
  onPercent: boolean;
  nodeEdgeHighlighting: NodeEdgeId;
}

interface EdgeWidth {
  minWidth: number;
  maxWidth: number;
}

const initialState: GraphState = {
  isLoading: false,
  error: '',
  viewId: '',
  draft: {} as ViewDraft,
  graph: {} as Graph,
  dfgFilters: {
    'activity-frequency': 1,
    'variant-frequency': 1
  },
  fuzzyFilters: {
    concurrency: false,
    'concurrency-offset': 1,
    'concurrency-preserve': 1,
    'edge-ignore-self-loops': false,
    'edge-interpret-abs': false,
    'edge-preserve': 1,
    'edge-sc-ratio': 1,
    'node-cut-off': 0.001
  },
  userParams: [],
  algorithmType: AlgorithmTypes.Dfg,
  graphMetrics: {} as GraphMetrics,
  nodeEdgeMetrics: {} as GraphNodeEdgeMetrics,
  width: {
    minWidth: GRAPH_EDGE_MIN_WIDTH,
    maxWidth: GRAPH_EDGE_MAX_WIDTH
  },
  isSidebar: false,
  graphSidebarTabIndex: 0,
  graphValue: GraphValues.CaseCount,
  onPercent: false,
  nodeEdgeHighlighting: {} as NodeEdgeId
};

export const graphSlice = createSlice({
  name: 'graph',
  initialState,
  reducers: {
    getFailed(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
    createDraft(state, action: PayloadAction<string>) {
      state.isLoading = true;
      state.viewId = action.payload;
      state.error = '';
    },
    setDraft(state, action: PayloadAction<ViewDraft>) {
      state.isLoading = false;
      state.draft = action.payload;
    },
    saveDraft(state) {
      state.isLoading = true;
      state.error = '';
    },
    saveDraftComplete(state) {
      state.isLoading = true;
      state.error = '';
    },
    setAlgorithmType(state, action: PayloadAction<AlgorithmTypes>) {
      state.algorithmType = action.payload;
    },
    setDfgFilters(state, action: PayloadAction<DfgRequest>) {
      state.dfgFilters = action.payload;
    },
    setFuzzyFilters(state, action: PayloadAction<FuzzyRequest>) {
      state.fuzzyFilters = action.payload;
    },
    getGraph(state) {
      state.isLoading = true;
      state.error = '';
    },
    setGraph(state, action: PayloadAction<Graph>) {
      state.isLoading = false;
      state.graph = action.payload;
    },
    setUserParams(state, action: PayloadAction<GraphParameters[]>) {
      state.userParams = action.payload;
    },
    setGraphMetrics(state, action: PayloadAction<GraphMetrics>) {
      state.graphMetrics = action.payload;
    },
    setNodeEdgeMetrics(state, action: PayloadAction<GraphNodeEdgeMetrics>) {
      state.nodeEdgeMetrics = action.payload;
    },
    setNodeEdgeHighlighting(state, action: PayloadAction<NodeEdgeId>) {
      state.nodeEdgeHighlighting = action.payload;
    },
    resetNodeEdgeMetrics(state) {
      state.nodeEdgeMetrics = initialState.nodeEdgeMetrics;
      state.isSidebar ? (state.isSidebar = false) : state.isSidebar;
      state.graphSidebarTabIndex = 0;
    },
    toggleSidebar(state) {
      state.isSidebar = !state.isSidebar;
    },
    toggleMetrics(state, action: PayloadAction<number>) {
      state.graphSidebarTabIndex = action.payload;
      !state.isSidebar ? (state.isSidebar = true) : state.isSidebar;
    },
    changeEdgeWidth(state, action: PayloadAction<EdgeWidth>) {
      state.isLoading = false;
      state.width = action.payload;
    },
    changeGraphValue(state, action: PayloadAction<GraphValues>) {
      state.isLoading = false;
      state.graphValue = action.payload;
    },
    toggleOnPercent(state, action: PayloadAction<boolean>) {
      state.isLoading = false;
      state.onPercent = action.payload;
    },
    resetDraft(state) {
      state.draft = initialState.draft;
    },
    resetGraph(state) {
      state.graph = initialState.graph;
    },
    resetGraphFilters(state) {
      state.dfgFilters = initialState.dfgFilters;
    },
    resetGraphMetrics(state) {
      state.graphMetrics = initialState.graphMetrics;
    },
    resetNodeEdgeHighlighting(state) {
      state.nodeEdgeHighlighting = initialState.nodeEdgeHighlighting;
    },
    resetGraphCommonParams(state) {
      state.isSidebar = initialState.isSidebar;
      state.width = initialState.width;
      state.graphValue = initialState.graphValue;
      state.algorithmType = initialState.algorithmType;
    }
  }
});

export const {
  getFailed,
  createDraft,
  setDraft,
  saveDraft,
  saveDraftComplete,
  setAlgorithmType,
  setDfgFilters,
  setFuzzyFilters,
  setUserParams,
  getGraph,
  setGraph,
  setGraphMetrics,
  setNodeEdgeMetrics,
  setNodeEdgeHighlighting,
  toggleSidebar,
  toggleMetrics,
  changeEdgeWidth,
  changeGraphValue,
  toggleOnPercent,
  resetDraft,
  resetGraph,
  resetGraphFilters,
  resetGraphMetrics,
  resetNodeEdgeMetrics,
  resetNodeEdgeHighlighting,
  resetGraphCommonParams
} = graphSlice.actions;

export const graphReducer = graphSlice.reducer;

const handleError = (error: AjaxError) => {
  if (error.status === 401) {
    return of(authLogout());
  } else if (error.status === 500 || error.status === 404) {
    return of(setGraph(null));
  }
  return of(getFailed(error.toString()));
};

export const draftEpic: AppEpic = (action$, state$) => {
  return action$.pipe(
    filter(createDraft.match),
    withLatestFrom(state$),
    switchMap(([, state]) =>
      postViewDraft(state.graph.viewId).pipe(
        map((data: ViewDraft) => setDraft(data)),
        catchError((err) => handleError(err))
      )
    )
  );
};

export const saveDraftEpic: AppEpic = (action$, state$) => {
  return action$.pipe(
    filter(saveDraft.match),
    withLatestFrom(state$),
    switchMap(([, state]) => {
      const newUserParams: GraphParameters[] = state.graph.userParams.map((userParam) => ({
        ...userParam,
        value:
          userParam.method === 'fuzzy' ? state.graph.fuzzyFilters[userParam.key] : state.graph.dfgFilters[userParam.key]
      }));
      const observables = newUserParams.map((userParam) =>
        patchDraftParameter(userParam.id, userParam).pipe(timeout(1000))
      );
      return forkJoin(...observables, () => saveDraftComplete());
    })
  );
};

export const saveDraftCompleteEpic: AppEpic = (action$, state$) => {
  return action$.pipe(
    filter(saveDraftComplete.match),
    withLatestFrom(state$),
    switchMap(([, state]) =>
      postDraft(state.graph.draft.id).pipe(
        map(() => resetDraft()),
        catchError(handleError)
      )
    )
  );
};

export const setDraftEpic: AppEpic = (action$) => {
  return action$.pipe(
    filter(setDraft.match),
    mergeMapTo([setDfgFilters(initialState.dfgFilters), setFuzzyFilters(initialState.fuzzyFilters), getGraph()])
  );
};

export const setAlgorithmTypeEpic: AppEpic = (action$) => {
  return action$.pipe(filter(setAlgorithmType.match), mapTo(getGraph()));
};

export const graphEpic: AppEpic = (action$, state$) => {
  return action$.pipe(
    filter(getGraph.match),
    debounceTime(1000),
    withLatestFrom(state$),
    switchMap(([, state]) =>
      (state.graph.algorithmType === AlgorithmTypes.Dfg
        ? postDfg(state.graph.draft.id, state.graph.dfgFilters)
        : postFuzzy(state.graph.draft.id, state.graph.fuzzyFilters)
      ).pipe(
        mergeMap((data: Graph) => [setGraph(data), setGraphMetrics(data.metrics)]),
        catchError(handleError)
      )
    )
  );
};

export const graphUserParametersEpic: AppEpic = (action$, state$) => {
  return action$.pipe(
    filter(setDraft.match),
    withLatestFrom(state$),
    withLatestFrom(state$),
    switchMap(([, state]) =>
      getDraftParams(state.graph.draft.id).pipe(
        map((response: GraphParameters[]) => setUserParams(response)),
        catchError(handleError)
      )
    )
  );
};

export const graphParametersEpic: AppEpic = (action$, state$) => {
  return action$.pipe(
    filter(setUserParams.match),
    withLatestFrom(state$),
    mergeMap(([, state]) => {
      const mappedParams = state.graph.userParams.map((parameter: GraphParameters) => [parameter.key, parameter.value]);
      const objParams = Object.fromEntries(mappedParams);
      return [setDfgFilters(objParams as DfgRequest), setFuzzyFilters(objParams as FuzzyRequest)];
    })
  );
};
