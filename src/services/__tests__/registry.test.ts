import { findNoopServicesInProduction } from '../registry';
import type { ServiceIdentity } from '../types';

const noop = (name: string): ServiceIdentity => ({ serviceName: name, isNoop: true });
const real = (name: string): ServiceIdentity => ({ serviceName: name, isNoop: false });

/**
 * SPEC §7: "No-op implementations must never be used in production builds."
 * The guard is what makes that sentence enforceable instead of aspirational.
 */
describe('findNoopServicesInProduction', () => {
  it('reports a no-op that is not allowlisted', () => {
    const offenders = findNoopServicesInProduction({ billing: noop('BillingService') }, []);
    expect(offenders).toEqual(['billing (BillingService)']);
  });

  it('ignores a no-op that is explicitly allowlisted for this stage of the build-out', () => {
    expect(findNoopServicesInProduction({ billing: noop('BillingService') }, ['billing'])).toEqual(
      [],
    );
  });

  it('ignores real implementations', () => {
    expect(findNoopServicesInProduction({ billing: real('RevenueCatBillingService') }, [])).toEqual(
      [],
    );
  });

  it('reports every offender, not just the first', () => {
    const offenders = findNoopServicesInProduction(
      { billing: noop('BillingService'), ads: noop('AdService'), config: real('ConfigService') },
      [],
    );
    expect(offenders).toHaveLength(2);
  });
});
