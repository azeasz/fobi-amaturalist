import { createContext, useContext, useReducer } from 'react';

const ObservationContext = createContext();

const initialState = {
  filterParams: {
    start_date: '',
    end_date: '',
    grade: [],
    has_media: false,
    media_type: '',
    radius: 10,
    data_source: ['fobi', 'burungnesia', 'kupunesia']
  },
  searchParams: {
    search: '',
    location: null,
    latitude: null,
    longitude: null
  }
};

const observationReducer = (state, action) => {
  switch (action.type) {
    case 'UPDATE_FILTERS':
      return {
        ...state,
        filterParams: {
          ...state.filterParams,
          ...action.payload
        }
      };
    case 'UPDATE_SEARCH':
      return {
        ...state,
        searchParams: {
          ...state.searchParams,
          ...action.payload
        }
      };
    case 'RESET_FILTERS':
      return {
        ...state,
        filterParams: initialState.filterParams
      };
    default:
      return state;
  }
};

export const ObservationProvider = ({ children }) => {
  const [state, dispatch] = useReducer(observationReducer, initialState);

  return (
    <ObservationContext.Provider value={{ state, dispatch }}>
      {children}
    </ObservationContext.Provider>
  );
};

export const useObservationContext = () => {
  const context = useContext(ObservationContext);
  if (!context) {
    throw new Error('useObservationContext must be used within ObservationProvider');
  }
  return context;
};