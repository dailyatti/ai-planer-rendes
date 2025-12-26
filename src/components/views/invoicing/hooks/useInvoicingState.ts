import { useReducer, useCallback } from 'react';
import { Invoice } from '../../../../types/planner';

type Tab = 'dashboard' | 'invoices' | 'clients' | 'analytics';

interface State {
    activeTab: Tab;
    modals: {
        createInvoice: boolean;
        addClient: boolean;
        addCompany: boolean;
    };
    selection: {
        selectedIds: Set<string>;
    };
    filters: {
        searchQuery: string;
    };
    previewInvoice: Invoice | null;
}

type Action =
    | { type: 'SET_TAB'; payload: Tab }
    | { type: 'OPEN_MODAL'; payload: keyof State['modals'] }
    | { type: 'CLOSE_MODALS' }
    | { type: 'SET_SEARCH'; payload: string }
    | { type: 'TOGGLE_SELECTION'; payload: string }
    | { type: 'SELECT_ALL'; payload: string[] } // Pass all IDs to select
    | { type: 'CLEAR_SELECTION' }
    | { type: 'SET_PREVIEW'; payload: Invoice | null }
    | { type: 'CLOSE_PREVIEW' };

const initialState: State = {
    activeTab: 'dashboard',
    modals: {
        createInvoice: false,
        addClient: false,
        addCompany: false,
    },
    selection: {
        selectedIds: new Set(),
    },
    filters: {
        searchQuery: '',
    },
    previewInvoice: null,
};

function reducer(state: State, action: Action): State {
    switch (action.type) {
        case 'SET_TAB':
            return { ...state, activeTab: action.payload };
        case 'OPEN_MODAL':
            return { ...state, modals: { ...state.modals, [action.payload]: true } };
        case 'CLOSE_MODALS':
            return {
                ...state,
                modals: { createInvoice: false, addClient: false, addCompany: false }
            };
        case 'CLOSE_PREVIEW':
            return { ...state, previewInvoice: null };
        case 'SET_SEARCH':
            return { ...state, filters: { ...state.filters, searchQuery: action.payload } };
        case 'TOGGLE_SELECTION': {
            const newSet = new Set(state.selection.selectedIds);
            if (newSet.has(action.payload)) {
                newSet.delete(action.payload);
            } else {
                newSet.add(action.payload);
            }
            return { ...state, selection: { ...state.selection, selectedIds: newSet } };
        }
        case 'SELECT_ALL':
            return { ...state, selection: { ...state.selection, selectedIds: new Set(action.payload) } };
        case 'CLEAR_SELECTION':
            return { ...state, selection: { ...state.selection, selectedIds: new Set() } };
        case 'SET_PREVIEW':
            return { ...state, previewInvoice: action.payload };
        default:
            return state;
    }
}

export function useInvoicingState() {
    const [state, dispatch] = useReducer(reducer, initialState);

    const setActiveTab = useCallback((tab: Tab) => dispatch({ type: 'SET_TAB', payload: tab }), []);
    const openModal = useCallback((modal: keyof State['modals']) => dispatch({ type: 'OPEN_MODAL', payload: modal }), []);
    const closeModals = useCallback(() => dispatch({ type: 'CLOSE_MODALS' }), []);
    const closePreview = useCallback(() => dispatch({ type: 'CLOSE_PREVIEW' }), []);
    const setSearchQuery = useCallback((query: string) => dispatch({ type: 'SET_SEARCH', payload: query }), []);
    const toggleSelection = useCallback((id: string) => dispatch({ type: 'TOGGLE_SELECTION', payload: id }), []);
    const selectAll = useCallback((ids: string[]) => dispatch({ type: 'SELECT_ALL', payload: ids }), []);
    const clearSelection = useCallback(() => dispatch({ type: 'CLEAR_SELECTION' }), []);
    const setPreviewInvoice = useCallback((invoice: Invoice | null) => dispatch({ type: 'SET_PREVIEW', payload: invoice }), []);

    return {
        state,
        setActiveTab,
        openModal,
        closeModals,
        closePreview,
        setSearchQuery,
        toggleSelection,
        selectAll,
        clearSelection,
        setPreviewInvoice
    };
}
