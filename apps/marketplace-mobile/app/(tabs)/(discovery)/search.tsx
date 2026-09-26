import { Redirect } from 'expo-router';

/** Existing /search links now open the compact card over discovery. */
export default function SearchScreen() {
  return <Redirect href={{ pathname: '/discover', params: { expandSearch: '1' } }} />;
}
