import 'reflect-metadata';
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { PERMISSIONS_KEY } from '../../iam/authorization/require-permissions.decorator';

/**
 * HTTP contract inventory. Loading every controller means the declarative
 * route, DTO and Swagger decorators are executed under coverage. Assert
 * registration, method/path identity and authentication boundaries. These
 * tests do NOT replace real HTTP e2e tests through Nest's guard pipeline.
 */
const locations = [
  "agent/agent.controller",
  "agent/company/agent-company.controller",
  "audit/audit.controller",
  "auth/auth.controller",
  "availability/check/check.controller",
  "availability/exception/exception.controller",
  "availability/schedule/schedule.controller",
  "availability/working-hours/working-hours.controller",
  "booking/customer/customer-booking.controller",
  "booking/provider/provider-booking.controller",
  "catalogue/category/category.controller",
  "catalogue/service/service.controller",
  "catalogue/variant/variant.controller",
  "commission/calculation/commission-calculation.controller",
  "commission/calculation/provider/provider-commission.controller",
  "commission/rule/commission-rule.controller",
  "customer/address/address.controller",
  "customer/customer.controller",
  "geography/district/district.controller",
  "geography/state/state.controller",
  "geography/taluk/taluk.controller",
  "geography/town-village/town-village.controller",
  "health/health.controller",
  "iam/assignment/role-assignment.controller",
  "iam/permission/permission.controller",
  "iam/role/role.controller",
  "notification/admin-notification.controller",
  "notification/notification.controller",
  "notification/push-device.controller",
  "payment/customer/customer-payment.controller",
  "payment/provider/provider-payment.controller",
  "provider-offering/offering-browse.controller",
  "provider-offering/offering.controller",
  "provider-onboarding/application-admin.controller",
  "provider-onboarding/application.controller",
  "provider-organization/organization.controller",
  "provider/provider.controller",
  "refund/policy/refund-policy.controller",
  "refund/process/customer/customer-refund.controller",
  "refund/process/refund.controller",
  "serviceability/check/check.controller",
  "serviceability/coverage-area/coverage-area-admin.controller",
  "serviceability/coverage-area/coverage-area.controller",
  "serviceability/coverage-profile/coverage-profile.controller",
  "serviceability/discovery/discovery.controller",
  "serviceability/matching/matching.controller",
  "settlement/config/settlement-config.controller",
  "settlement/run/provider/provider-settlement.controller",
  "settlement/run/settlement.controller",
  "tax/tax-assessment.controller"
] as const;

type Constructor = new (...args: unknown[]) => object;
function describeController(path: string) {
  const exports = require('../../' + path) as Record<string, unknown>;
  const candidates = Object.values(exports).filter(
    (value): value is Constructor => typeof value === 'function' && Reflect.hasMetadata(PATH_METADATA, value),
  );
  expect(candidates).toHaveLength(1);
  const target = candidates[0]!;
  const prototype = target.prototype;
  const routes = Object.getOwnPropertyNames(prototype)
    .filter(name => name !== 'constructor')
    .map(name => ({
      name,
      fn: (prototype as Record<string, unknown>)[name],
    }))
    .filter(({ fn }) => typeof fn === 'function' && Reflect.hasMetadata(METHOD_METADATA, fn));
  return { target, routes };
}

describe('All REST controller metadata contracts', () => {
  it.each(locations)('%s declares at least one HTTP route and no internal route duplicate', (path) => {
    const { target, routes } = describeController(path);
    expect(Reflect.getMetadata(PATH_METADATA, target)).toBeDefined();
    expect(routes.length).toBeGreaterThan(0);
    const seen = routes.map(({ fn }) => {
      const method = Reflect.getMetadata(METHOD_METADATA, fn) as RequestMethod;
      expect(Object.values(RequestMethod)).toContain(method);
      const routePath = Reflect.getMetadata(PATH_METADATA, fn) as string | undefined;
      expect(routePath).toBeDefined();
      return method + ':' + JSON.stringify(routePath);
    });
    expect(new Set(seen).size).toBe(seen.length);
  });

  it.each([
    'booking/customer/customer-booking.controller',
    'booking/provider/provider-booking.controller',
    'payment/customer/customer-payment.controller',
    'payment/provider/provider-payment.controller',
    'notification/push-device.controller',
    'provider-onboarding/application.controller',
    'provider-onboarding/application-admin.controller',
    'provider-organization/organization.controller',
    'tax/tax-assessment.controller',
    'iam/assignment/role-assignment.controller',
    'commission/rule/commission-rule.controller',
    'settlement/run/settlement.controller',
    'refund/process/refund.controller',
  ])('%s is protected by JwtAuthGuard for every route', path => {
    const { target, routes } = describeController(path);
    const parentGuards = Reflect.getMetadata(GUARDS_METADATA, target) as Function[] | undefined;
    for (const { name, fn } of routes) {
      const methodGuards = Reflect.getMetadata(GUARDS_METADATA, fn) as Function[] | undefined;
      expect([...(parentGuards ?? []), ...(methodGuards ?? [])].some(
        guard => guard?.name === 'JwtAuthGuard'
      )).toBe(true);
    }
  });

  it.each([
    ['provider-organization/organization.controller', 'provider.organization.manage'],
    ['tax/tax-assessment.controller', 'tax.assessment.manage'],
    ['provider-onboarding/application-admin.controller', 'provider.onboarding.review'],
  ])('%s enforces a specific management permission on every route', (path, permission) => {
    const { target, routes } = describeController(path);
    const parentPermissions = Reflect.getMetadata(PERMISSIONS_KEY, target) as string[] | undefined;
    for (const { fn } of routes) {
      const routePermissions = Reflect.getMetadata(PERMISSIONS_KEY, fn) as string[] | undefined;
      expect([...(parentPermissions ?? []), ...(routePermissions ?? [])]).toContain(permission);
    }
  });

  it('protects password changes and identity lookup in the otherwise public auth controller', () => {
    const { target, routes } = describeController('auth/auth.controller');
    const guards = Reflect.getMetadata(GUARDS_METADATA, target) as Function[] | undefined;
    for(const method of ['me', 'setPassword']){
      const route = routes.find(x => x.name === method);
      expect(route).toBeDefined();
      const local = Reflect.getMetadata(GUARDS_METADATA, route!.fn) as Function[] | undefined;
      expect([...(guards ?? []), ...(local ?? [])].some(x => x?.name === 'JwtAuthGuard')).toBe(true);
    }
  });
});
