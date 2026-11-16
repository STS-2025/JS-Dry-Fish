# 🚀 Supabase Setup & Deployment Guide (தமிழ் & English)

இந்த வழிகாட்டி மூலம் உங்கள் JS Dry Fish Shop (Thoothukudi Karuvadu) இணையதளத்தை **Supabase** உடன் இணைத்து **Netlify / Vercel**-ல் எளிதாக deploy செய்யலாம்.

---

## ⚡ 1. Supabase Project உருவாக்குதல் (Create Supabase Project)

1. [https://supabase.com](https://supabase.com) இணையதளத்திற்கு சென்று இலவச கணக்கு (Free Account) தொடங்கவும்.
2. **New Project** கிளிக் செய்து:
   - **Name:** `antotutyfishhub`
   - **Database Password:** பாதுகாப்பான கடவுச்சொல் ஒன்றை கொடுத்து குறித்துக்கொள்ளவும்.
   - **Region:** `South Asia (Mumbai)` அல்லது உங்களுக்கு விருப்பமான பகுதியை தேர்ந்தெடுக்கவும்.
3. Project தயாரானதும், இடது பக்க மெனுவில் **SQL Editor** திறக்கவும்:
   - [`supabase/schema.sql`](./supabase/schema.sql) கோப்பில் உள்ள அனைத்து வரிகளையும் நகலெடுத்து (Copy) SQL Editor-ல் ஒட்டவும் (Paste).
   - **Run** (Ctrl + Enter) பட்டனை அழுத்தவும்.
   - இது `orders`, `customers`, `products`, `coupons`, `store_settings`, `product_ratings`, `product_order_totals` ஆகிய அட்டவணைகளையும் (Tables), customer profile trigger-ஐயும், ஆர்டர்/வாடிக்கையாளர்/மதிப்பீடுகளுக்கான Row Level Security (RLS) விதிகளையும் தானாக உருவாக்கும்!
   - ஏற்கனவே Supabase அமைத்திருந்தால், `schema.sql`-இன் கடைசியில் உள்ள **PRODUCT RATINGS** block-ஐ மீண்டும் SQL Editor-ல் இயக்கவும். இது summary view-ஐ சரிசெய்து, ratings எண்ணிக்கையையும் சராசரியையும் மட்டும் பகிரும்; தனிப்பட்ட வாக்குகளை வெளிப்படுத்தாது. இதனால் பழைய product catalog மீண்டும் seed செய்யப்படாது.
   - **Popularity** sort அதிகம் ஆர்டர் செய்யப்பட்ட பொருட்களை காட்ட, `schema.sql`-இன் கடைசியில் உள்ள **PRODUCT ORDER TOTALS** block-ஐயும் SQL Editor-ல் இயக்கவும். இது product code, order count, units sold ஆகிய aggregate-களை மட்டும் public-ஆகப் பகிரும்; customer அல்லது order விவரங்களை வெளிப்படுத்தாது. புதிய orders அல்லது cancellations வந்ததும் totals தானாகப் புதுப்பிக்கப்படும்.
   - வாடிக்கையாளர் மதிப்பீடுகள் பகிரப்பட Supabase அமைப்பு அவசியம். Supabase இல்லையெனில் rating அளிப்பது முடக்கப்படும்; தனிப்பட்ட browser-ல் மட்டும் சேமிக்கப்படாது.
   - Supabase இணைக்கப்பட்ட தளத்தில் மற்ற வாடிக்கையாளர்களின் திறந்த பக்கங்களிலும் மதிப்பீட்டு சராசரியும் எண்ணிக்கையும் 30 வினாடிக்குள் புதுப்பிக்கப்படும்.
   - Supabase இணைப்புடன் தளத்தைத் திறக்கும் போது, முன்பு அந்த browser-ல் மட்டும் சேமிக்கப்பட்ட rating-களும் Supabase-க்கு sync செய்யப்படும்.

---

## 🔑 2. API Keys எடுப்பது எப்படி? (Get Project Keys)

1. Supabase-ல் **Project Settings (பல்சக்கர ஐகான்)** -> **API** பகுதிக்கு செல்லவும்.
2. அங்கே இருக்கும் 2 விவரங்களை எடுக்கவும்:
   - **Project URL:** `https://xxxxxxxxxxxx.supabase.co`
   - **Project API Keys -> `anon` `public`:** `eyJhbGciOiJIUzI1NiIsInR5cCI6...`

---

## 💻 3. React App-ல் இணைப்பது (Local & Environment Config)

`antotutyfishhub-react` கோப்புறையில் உள்ள `.env` கோப்பில் உங்கள் விவரங்களை உள்ளிடவும்:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key
```

---

## 🌐 4. Netlify / Vercel-ல் Deploy செய்வது எப்படி?

### Netlify Deployment:
1. GitHub-ல் உங்கள் project-ஐ push செய்யவும்.
2. [Netlify.com](https://netlify.com)-ல் **Add new site** -> **Import an existing project** கொடுக்கவும்.
3. Settings:
   - **Base directory:** `antotutyfishhub-react`
   - **Build command:** `npm run build`
   - **Publish directory:** `antotutyfishhub-react/dist`
4. **Environment variables** பிரிவில் Add Variable கொடுக்கவும்:
   - `VITE_SUPABASE_URL` = (உங்கள் Supabase Project URL)
   - `VITE_SUPABASE_ANON_KEY` = (உங்கள் Supabase Anon Key)
5. **Deploy Site** கிளிக் செய்யவும்! 1 நிமிடத்தில் உங்கள் இணையதளம் live ஆகிவிடும்!

---

## 🛒 5. Online Order & Admin Dashboard அம்சங்கள்

- **வாடிக்கையாளர் ஆர்டர் (Customer Checkout):**
  - வாடிக்கையாளர் பெயர், 10 இலக்க தொலைபேசி எண், பின்கோடு, முகவரி உள்ளிட்டு "Confirm Order" கொடுத்தவுடன் ஆர்டர் Supabase-ல் உடனடியாக சேமிக்கப்படும்.
  - ஆர்டர் ID (எ.கா. `ATF-482915`) உருவாகி திரையில் தோன்றும்.
  - உடனே ஒரு கிளிக்கில் வாட்ஸ்அப்பில் கடை உரிமையாளருக்கு (`8925151252`) ரசீது அனுப்பும் வசதியும் உள்ளது.
  
- **ஆர்டர் ட்ராக்கிங் (Order Tracking):**
  - வாடிக்கையாளர் தன் Order ID மற்றும் Phone Number கொடுத்து ஆர்டரின் தற்போதைய நிலையை (Pending / Confirmed / Packed / Shipped / Delivered) எப்போது வேண்டுமானாலும் அறியலாம்.

- **நிர்வாகி பக்கம் (Admin Panel):**
  - உங்கள் தளத்தின் முகவரியில் `/admin.html` திறக்கவும் (எ.கா: `https://your-site.netlify.app/admin.html`).
  - Supabase Dashboard-ல் **Authentication → Users** வழியாக admin பயனரை உருவாக்கி, email-ஐ confirm செய்யவும். Admin username-ஐ website sign-in-ல் பயன்படுத்த வேண்டும்.
  - அந்த Supabase பயனரின் UUID-ஐ எடுத்துக்கொண்டு, `admin_user` table-ல் username, email, UUID இணைப்பை சேமிக்கவும்:

    ```sql
    INSERT INTO public.admin_user (id, username, email, auth_user_id)
    VALUES (1, 'your-admin-username', 'admin@example.com', 'SUPABASE_AUTH_USER_UUID')
    ON CONFLICT (id) DO UPDATE SET
      username = EXCLUDED.username,
      email = EXCLUDED.email,
      auth_user_id = EXCLUDED.auth_user_id;
    ```

  - ஏற்கனவே Supabase அமைத்திருந்தால், முதலில் புதுப்பிக்கப்பட்ட [`supabase/schema.sql`](./supabase/schema.sql)-ஐ SQL Editor-ல் இயக்கவும். Admin sign-in Supabase Auth-ல் password-ஐ சரிபார்த்து, `admin_user` table-ல் username மற்றும் admin அனுமதியை உறுதிப்படுத்தும். Admin dashboard-ன் write policies-மும் Supabase Auth மூலம் சரிபார்க்கப்படும்.
  - அனைத்து வாடிக்கையாளர் ஆர்டர்களையும் பார்க்கலாம், ஒரே கிளிக்கில் வாடிக்கையாளருக்கு Call / WhatsApp செய்யலாம், மற்றும் Status மாற்றலாம்.

## 👤 6. Customer Accounts & Profiles

- SMS/OTP இல்லாத phone/password sign-up மற்றும் sign-in-க்கு Supabase Dashboard-ல் **Authentication → Sign In / Providers → Email**-ஐ enable செய்து, **Confirm email**-ஐ off செய்யவும். Customer email field கேட்கப்படாது; `customer-<mobile>@example.com` என்ற internal identifier-ஐ Supabase Auth பயன்படுத்தும். Phone provider அல்லது Twilio credentials தேவையில்லை.
- Registration-ல் பெயர், இந்திய 10 இலக்க mobile number, password, password confirmation கேட்கப்படும். மீண்டும் login செய்ய mobile number மற்றும் password பயன்படுத்தப்படும்.
- பெயர் மற்றும் phone number `public.customers` profile table-ல் சேமிக்கப்படும். Password-கள் பாதுகாப்பாக Supabase Auth-ல் மட்டும் நிர்வகிக்கப்படும்; password அல்லது password hash-ஐ `public.customers` table-ல் சேமிக்க வேண்டாம்.
- OTP இல்லாததால் mobile ownership உறுதிசெய்யப்படாது; யாரும் பதிவு செய்யாத எண்ணை ஒருவர் முதலில் account-ஆகப் பயன்படுத்தக்கூடும். Internal email முகவரி பெறக்கூடியதல்ல என்பதால் password மறந்தால் email வழி மீட்பு கிடையாது.
- Customer Auth trigger phone number-ஐ `public.customers`-ல் சேர்க்கும். புதிய அமைப்புக்கு `supabase/schema.sql`-ஐ SQL Editor-ல் இயக்கவும்.
- Signed-in customer-ன் orders `customer_id` மூலம் இணைக்கப்படும். Admin dashboard-ல் **Customers** பக்கத்தில் registered customer பட்டியல், profile விவரங்கள், மற்றும் order history காணலாம்.
- Supabase ஏற்கனவே அமைக்கப்பட்டிருந்தால், `supabase/schema.sql`-ஐ மீண்டும் SQL Editor-ல் இயக்கி customer table, trigger, RLS policies மற்றும் order linkage-ஐ சேர்க்கவும்.
