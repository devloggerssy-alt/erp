/**
 * Minimal interface that a service must satisfy for
 * {@link createStandardCrudControllerBase}.
 *
 * Concrete service classes that extend {@link CrudService} already satisfy this automatically.
 */
export interface ICrudService<TResponse, TCreateDto, TUpdateDto> {
  list(tenantId: string, options: Record<string, any>): Promise<{ data: TResponse[]; total: number }>;
  findById(tenantId: string, id: string): Promise<TResponse>;
  create(tenantId: string, dto: TCreateDto): Promise<TResponse>;
  update(tenantId: string, id: string, dto: TUpdateDto): Promise<TResponse>;
  delete(tenantId: string, id: string): Promise<void>;
}
