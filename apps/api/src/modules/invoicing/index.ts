/**
 * Public API of the invoicing domain. Other domains import from
 * 'modules/invoicing' only (Phase 5.2). Files inside invoicing must not
 * import this barrel.
 */
export { computeInvoicePaidState } from './invoices/presenters/invoice.presenter';
