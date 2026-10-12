/**
 * Header options for modal create/edit screens. The native header is hidden;
 * `<FormScreen closable>` draws the title and close button in one row instead.
 * Use as `<Stack.Screen options={useModalHeader()} />`.
 */
export function useModalHeader() {
  return { headerShown: false };
}
