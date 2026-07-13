import { useDispatch, useSelector } from 'react-redux';

// Thin re-exports so feature code imports hooks from one place.
// If migrating to TypeScript, type these with RootState/AppDispatch.
export const useAppDispatch = () => useDispatch();
export const useAppSelector = useSelector;
