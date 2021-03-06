/* @flow */
import { CALL_API } from 'redux-api-middleware';
import moment from 'moment';
import { LOGOUT } from '../Auth/reducer';
import { API_REQUEST, API_ERROR } from '../Errors/reducer';
import type {
  State,
  Project,
  ThunkAction,
  Action,
  Frame,
  Report,
} from '../types';
import { sortByDuration } from '../utils';

// State
export type ProjectReportState = {
  frames: Array<Object>,
  from: moment,
  to: moment,
  tags: Array<string>,
  project: ?Project,
  report: Report,
  workloads: Array<Object>,
};

const DATE_FORMAT = 'YYYY-MM-DD';

const initialState: ProjectReportState = {
  frames: [],
  from: moment().subtract(7, 'days'),
  to: moment(),
  tags: [],
  project: null,
  report: {
    total: 0,
    tagReports: [],
  },
  workloads: [],
};

// Actions
const FETCH_SUCCESS = 'crick/projectReport/FETCH_SUCCESS';
const REPORT_COMPILED = 'crick/projectReport/COMPILE_REPORT';
const UPDATE_DATE_SPAN = 'crick/projectReport/UPDATE_DATE_SPAN';
const UPDATE_TAGS = 'crick/projectReport/UPDATE_TAGS';
const FETCH_WORKLOADS_SUCCESS = 'crick/projectReport/FETCH_WORKLOADS_SUCCESS';
const UPDATE_PROJECT_DATA = 'crick/projectReport/UPDATE_PROJECT_DATA';

export const fetchFrames = (
  id: string,
  from: moment,
  to: moment,
  tags: Array<string>,
  limit: number
): ThunkAction => {
  return (dispatch, getState) => {
    const endpoint = `${process.env.REACT_APP_API_HOST || ''}/frames`;
    const query = [
      `projectId=${id}`,
      `from=${from.format(DATE_FORMAT)}`,
      `to=${to.format(DATE_FORMAT)}`,
      `limit=${limit}`,
    ];

    if (tags.length > 0) {
      query.push(`tags=${tags.join(',')}`);
    }

    dispatch({
      [CALL_API]: {
        endpoint: `${endpoint}?${query.join('&')}`,
        method: 'GET',
        headers: { Accept: 'application/json' },
        types: [API_REQUEST, FETCH_SUCCESS, API_ERROR],
      },
    });
  };
};

export const fetchWorkloads = (id: string): Action => {
  return {
    [CALL_API]: {
      endpoint: `${process.env.REACT_APP_API_HOST ||
        ''}/projects/${id}/workloads`,
      method: 'GET',
      headers: { Accept: 'application/json' },
      types: [API_REQUEST, FETCH_WORKLOADS_SUCCESS, API_ERROR],
    },
  };
};

export const compileReport = (frames: Array<Frame>): Action => {
  const tmp = frames.reduce(
    (r, frame) => {
      const duration = moment(frame.end_at).diff(moment(frame.start_at));

      r.total += duration;
      frame.tags.forEach(t => {
        let d = r.tagReports.has(t) ? r.tagReports.get(t) : 0;

        d += duration;
        r.tagReports.set(t, d);
      });

      return r;
    },
    {
      total: 0,
      tagReports: new Map(),
    }
  );

  // An array is easier to manipulate
  const report = {
    total: tmp.total,
    tagReports: Array.from(tmp.tagReports).map(tagReport => {
      return {
        tag: tagReport[0],
        duration: tagReport[1],
      };
    }),
  };

  // Sort tags by duration
  report.tagReports.sort(sortByDuration);

  return {
    type: REPORT_COMPILED,
    report,
  };
};

export const updateDateSpan = (from: moment, to: moment): Action => ({
  type: UPDATE_DATE_SPAN,
  from,
  to,
});

export const updateTags = (tags: Array<string>): Action => ({
  type: UPDATE_TAGS,
  tags,
});

export const updateProjectData = (
  from: moment,
  to: moment,
  tags: Array<string>
): Action => ({
  type: UPDATE_PROJECT_DATA,
  from,
  to,
  tags,
});

// Selectors
export const selectProjectReportState = (state: State): ProjectReportState => {
  return state.projectReport;
};

export const selectProjectId = (state: ProjectReportState): ?string => {
  if (!state.project) {
    return null;
  }

  return state.project.id;
};

export const selectProjectName = (state: ProjectReportState): ?string => {
  if (!state.project) {
    return null;
  }

  return state.project.name;
};

// Reducer
export default function reducer(
  state: ProjectReportState = initialState,
  action: Action = {}
): ProjectReportState {
  switch (action.type) {
    case FETCH_SUCCESS:
      return {
        ...state,
        frames: action.payload.frames,
        project: action.payload.meta.project,
      };

    case REPORT_COMPILED:
      return {
        ...state,
        report: action.report,
      };

    case UPDATE_DATE_SPAN:
      return {
        ...state,
        from: action.from,
        to: action.to,
      };

    case UPDATE_TAGS:
      return {
        ...state,
        tags: action.tags,
      };

    case FETCH_WORKLOADS_SUCCESS:
      return {
        ...state,
        workloads: action.payload.workloads,
      };

    case UPDATE_PROJECT_DATA:
      return {
        ...state,
        from: action.from,
        to: action.to,
        tags: action.tags,
      };

    case LOGOUT:
      return initialState;

    default:
      return state;
  }
}
