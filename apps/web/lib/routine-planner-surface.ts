export const routinePlannerTabs = [
  { value: "preview", label: "الأسبوع" },
  { value: "routine", label: "الروتين" },
] as const

export const floatingPlannerActions = [
  { value: "calendar", label: "تعبئة Google Calendar" },
  { value: "settings", label: "إعدادات الصلاة والموقع" },
] as const

export const userFacingSettingsCopy = {
  title: "إعدادات الصلاة والموقع",
  description:
    "اضبط موقعك وطريقة حساب الصلاة، وستتغير الفترات تلقائيا مع الوقت.",
  useCurrentLocation: "استخدام موقعي الحالي",
  resetRiyadh: "استعادة إعدادات الرياض",
  locationLoading: "جاري قراءة موقعك...",
  locationReady: "تم تحديث الموقع. ستتجدد أوقات الصلاة الآن.",
  locationUnavailable: "الموقع غير متاح في هذا المتصفح.",
  locationDenied: "لم يتم السماح بقراءة الموقع.",
  locationFailed: "تعذر قراءة الموقع الآن.",
} as const
