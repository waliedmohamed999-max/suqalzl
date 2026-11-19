# Runbook — الـ Trusted proxy و IP العميل (`TRUSTED_PROXY_HOPS`) — devops-engineer

> آخر تحديث: 2026-11-19 (P1-03b). المرجع: QA-B1 (`docs/reviews/qa-p1-01.md`)، D36-2، التنفيذ في `src/lib/http.ts` (`clientIp()`، backend-engineer P1-01d). الاتفاق على الاسم والمعنى في `docs/runbooks/notes-for-backend.md` §10.

## المشكلة اللي بيحلها
`X-Forwarded-For` قائمة **كل proxy بيضيف عليها من اليمين**. أي حاجة على شمال آخر proxy بتاعنا كتبها العميل نفسه، فلو التطبيق أخد أول قيمة (السلوك القديم) أي حد يقدر يغيّر الـ IP بتاعه ويعدّي الـ rate limit (QA-B1: 8 أرقام × XFF مختلف = 8×200).

## الإعداد
| `TRUSTED_PROXY_HOPS` | الاستخدام | الـ IP اللي التطبيق بياخده |
|---|---|---|
| `0` (الافتراضي) | التطوير، الـ CI، أي بيئة التطبيق فيها مفتوح مباشرة | **ولا حاجة** (`null`): الـ IP مش بيدخل في الحدود؛ حدود الرقم/الإيميل والسقف الكلي للـ SMS شغالين |
| `1` | proxy واحد بتاعنا قدام التطبيق (nginx أو Passenger أو الـ load balancer بتاع الاستضافة) | آخر قيمة في XFF |
| `2` | CDN + proxy/load balancer | قبل الأخيرة |
| أي قيمة تانية مش رقم صحيح 0–10 | — | بتتعامل كـ `0` |

- لو XFF فيها قيم أقل من N، الطلب ما جاش من سلسلة الـ proxies بتاعتنا، فالـ IP = `null`.
- لو القيمة مش IP صحيح (`net.isIP`)، الـ IP = `null`.
- **رقم أكبر من الحقيقة خطر** (العميل يقدر يزوّر). **رقم أصغر** بيخلي كل الطلبات تبان جاية من الـ proxy نفسه، فالحد بالـ IP يقفل على كل الناس مع بعض. لازم الرقم يكون مظبوط بالتجربة.
- شرط على الـ proxy: لازم **يضيف** على XFF (nginx: `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`) أو يكتبه من جديد بـ IP اللي اتصل بيه (`$remote_addr`). ممنوع يعدّي XFF بتاع العميل زي ما هو من غير ما يضيف.
- `X-Real-IP` مش بيتقري خالص.

## التحقق في كل بيئة (P7، قبل ما أي staging/prod يستقبل ترافيك)
1. اعرف السلسلة: العميل ← (CDN؟) ← (load balancer؟) ← (nginx/Passenger؟) ← التطبيق. عدد اللي بيضيفوا على XFF = N.
2. حط `TRUSTED_PROXY_HOPS=N` في متغيرات البيئة واعمل restart.
3. من جهاز برا، بـ IP معروف:
   ```bash
   curl -s -H 'X-Forwarded-For: 203.0.113.7' https://<staging-host>/api/health
   ```
   وبعدين في سجل التطبيق (أو `audit_logs`/`otp_rate_limits` بعد طلب OTP تجريبي) الـ IP المسجل لازم يكون **IP جهازك الحقيقي**، مش `203.0.113.7` ومش IP الـ proxy.
4. كرر من غير الهيدر: نفس النتيجة.
5. سجّل N والنتيجة في go-live checklist (P7). أي تغيير في السلسلة (CDN جديد، load balancer) = تكرار الخطوات.

## مكانه في الكود والـ CI
- القراءة: `trustedProxyHops()` و `clientIp()` في `src/lib/http.ts` (backend-engineer). اختبارات الـ regression في `tests/db/p1-01d-security.test.ts`.
- الـ CI والـ e2e شغالين بـ `0` (من غير proxy)، يعني حدود الـ IP مقفولة هناك عن قصد؛ اختبارات الحدود بتظبط القيمة جوه الاختبار نفسه.
