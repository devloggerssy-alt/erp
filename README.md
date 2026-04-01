````md
# NestJS Boilerplate – Architecture Documentation

هذا الملف يشرح هيكلية المشروع، مسؤولية كل مجلد، وكيفية استخدامه مع أمثلة بسيطة.  
الهدف من هذه التقسيمة هو إنشاء Boilerplate احترافي قابل لإعادة الاستخدام في مشاريع SaaS و ERP و E-commerce.

---

## src/

الجذر الرئيسي للتطبيق ويحتوي على نقطة التشغيل وربط جميع الوحدات.

### main.ts
نقطة تشغيل التطبيق (Bootstrap).

### app.module.ts
يجمع كل الـ Modules الأساسية ولا يحتوي أي Business Logic.

```ts
@Module({
  imports: [ConfigModule, UsersModule, AuthModule],
})
export class AppModule {}
````

---

## src/config/

### الهدف

إدارة إعدادات التطبيق بشكل منظم، مع Validation للـ Environment Variables.

### ماذا نضع هنا؟

* قراءة `process.env`
* التحقق من القيم
* تقسيم الإعدادات حسب concern (app, db, auth…)

### مثال

```ts
export default () => ({
  app: {
    port: process.env.PORT || 3000,
  },
});
```

قاعدة:

* يمنع استخدام `process.env` مباشرة خارج هذا المجلد.

---

## src/common/

### الهدف

كود مشترك مرتبط بـ NestJS و HTTP lifecycle، بدون أي منطق أعمال.

### ماذا نضع هنا؟

* Guards
* Interceptors
* Filters
* Pipes
* Decorators
* Base classes

### مثال Guard

```ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

### مثال Decorator

```ts
export const CurrentUser = createParamDecorator(
  (_, ctx) => ctx.switchToHttp().getRequest().user
);
```

قواعد:

* ❌ ممنوع Business Logic
* ❌ ممنوع التعامل مع Database
* ✅ مسموح أي شيء مرتبط بالـ Framework

---

## src/shared/

### الهدف

منطق مشترك بين أكثر من Module وله معنى على مستوى التطبيق أو الـ Business، وغير مرتبط بـ HTTP.

### ماذا نضع هنا؟

* Value Objects
* Services مشتركة
* Cross-module logic

### مثال Value Object

```ts
export class Money {
  constructor(
    public readonly amount: number,
    public readonly currency: Currency
  ) {}

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Currency mismatch');
    }
    return new Money(this.amount + other.amount, this.currency);
  }
}
```

قاعدة ذهبية:

* إذا أزلنا NestJS، يجب أن يبقى هذا المجلد منطقياً وقابلاً للاستخدام.

---

## src/infrastructure/

### الهدف

التعامل مع الأمور التقنية الخارجية فقط.

### ماذا نضع هنا؟

* ORM (Prisma / TypeORM)
* Redis / Cache
* Mail
* Storage
* Queues

### مثال Repository

```ts
@Injectable()
export class UserRepository implements UserRepositoryInterface {
  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }
}
```

قواعد:

* infrastructure يعرف الـ domain
* الـ domain لا يعرف infrastructure ❌

---

## src/modules/

### الهدف

كل Module يمثل Feature مستقلة (Users, Orders, Products…).

### هيكلية أي Module

```
users/
├── domain
├── application
├── infrastructure
├── api
└── users.module.ts
```

---

### domain/

يمثل كيان النظام والقواعد الأساسية.

```ts
export class User {
  constructor(
    public id: string,
    public email: string
  ) {}
}
```

---

### application/

يحتوي Use Cases ومنطق الأعمال.

```ts
@Injectable()
export class CreateUserUseCase {
  execute(dto: CreateUserDto) {
    // business logic
  }
}
```

قاعدة:

* لا يعرف HTTP
* لا يعرف Controllers

---

### infrastructure/

تنفيذ فعلي للتعامل مع DB أو Services خارجية داخل هذا الـ Feature.

---

### api/

Controllers و DTO فقط.

```ts
@Controller('users')
export class UsersController {
  @Post()
  create(@Body() dto: CreateUserDto) {}
}
```

قاعدة:

* Controller لا يحتوي Business Logic

---

## src/health/

### الهدف

Health Check Endpoint لمراقبة حالة النظام.

### مثال

```ts
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}
```

قواعد:

* بدون Auth
* سريع وخفيف

---

## قواعد معمارية مختصرة

* Feature-Based Architecture
* Business Logic داخل application فقط
* Framework Logic داخل common فقط
* Cross-domain logic داخل shared
* Infrastructure منفصلة وقابلة للاستبدال

هذه الهيكلية مصممة لتكون أساساً ثابتاً وقابلاً للتوسع في مشاريع كبيرة وطويلة العمر.

```
```
