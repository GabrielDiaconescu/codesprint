import { StateView } from './StateView';

/**
 * Honest empty state for screens whose feature has not shipped yet (SPEC §59.12: never
 * present mocked data as real). It states plainly what will appear here and when.
 *
 * A thin wrapper over StateView so the "not built yet" screens are trivially greppable and
 * can be removed as each phase fills its screen in.
 */
export const PlaceholderState = ({ title, body }: { title: string; body: string }) => (
  <StateView icon="construct-outline" title={title} body={body} />
);
