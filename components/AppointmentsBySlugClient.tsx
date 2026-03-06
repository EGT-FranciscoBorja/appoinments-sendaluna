'use client';

import React, { useState, useEffect, useMemo } from 'react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import type { AppointmentEvent } from '@/lib/appointments/queries';

interface Slot {
  start: string;
  end: string;
}

interface AppointmentsBySlugClientProps {
  initialEvent: AppointmentEvent;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getCalendarDays(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDow = first.getDay() === 0 ? 6 : first.getDay() - 1;
  const daysInMonth = last.getDate();
  const result: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) result.push(null);
  for (let d = 1; d <= daysInMonth; d++) result.push(d);
  return result;
}

export default function AppointmentsBySlugClient({ initialEvent }: AppointmentsBySlugClientProps) {
  const [step, setStep] = useState<'date' | 'time' | 'details' | 'confirmed'>('date');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [datesLoading, setDatesLoading] = useState(true);
  const [calendarMonth, setCalendarMonth] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() });
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [form, setForm] = useState({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    number_of_attendees: 1,
    notes: '',
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [bookingId, setBookingId] = useState<number | null>(null);

  useEffect(() => {
    setDatesLoading(true);
    fetch(`/api/appointments/events/${initialEvent.slug}/dates`)
      .then((res) => res.json())
      .then((data) => {
        const dates = Array.isArray(data.dates) ? data.dates : [];
        setAvailableDates(dates);
        if (dates.length > 0) {
          const d = new Date(dates[0] + 'T12:00:00');
          setCalendarMonth({ year: d.getFullYear(), month: d.getMonth() });
        }
        setDatesLoading(false);
      })
      .catch(() => setDatesLoading(false));
  }, [initialEvent.slug]);

  useEffect(() => {
    if (!selectedDate) return;
    setSlotsLoading(true);
    setSlots([]);
    const params = new URLSearchParams({ date: selectedDate });
    fetch(`/api/appointments/events/${initialEvent.slug}/slots?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.slots) setSlots(data.slots);
        setSlotsLoading(false);
      })
      .catch(() => setSlotsLoading(false));
  }, [selectedDate, initialEvent.slug]);

  const handleSelectSlot = (slot: Slot) => {
    setSelectedSlot(slot);
    setStep('details');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;
    setError('');
    setSubmitLoading(true);
    try {
      const res = await fetch('/api/appointments/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: initialEvent.id,
          guest_name: form.guest_name.trim(),
          guest_email: form.guest_email.trim(),
          guest_phone: form.guest_phone.trim() || undefined,
          number_of_attendees: form.number_of_attendees >= 1 ? form.number_of_attendees : undefined,
          notes: form.notes.trim() || undefined,
          start_at: selectedSlot.start.replace(' ', 'T'),
          end_at: selectedSlot.end.replace(' ', 'T'),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error booking');
        setSubmitLoading(false);
        return;
      }
      setBookingId(data.id);
      setStep('confirmed');
    } catch {
      setError('Connection error. Please try again.');
    }
    setSubmitLoading(false);
  };

  const formatSlotTime = (slotStart: string) => {
    const [, timePart] = slotStart.split(' ');
    const [h, m] = (timePart || '').split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' });
  };

  const formatLongDate = (dateStr: string) => {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const monthLabel = useMemo(
    () => new Date(calendarMonth.year, calendarMonth.month, 1).toLocaleDateString('en', { month: 'long', year: 'numeric' }),
    [calendarMonth.year, calendarMonth.month]
  );

  const calendarDays = useMemo(
    () => getCalendarDays(calendarMonth.year, calendarMonth.month),
    [calendarMonth.year, calendarMonth.month]
  );

  const isDateAvailable = (day: number) => {
    const dateStr = `${calendarMonth.year}-${String(calendarMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return availableDates.includes(dateStr);
  };

  const selectDate = (day: number) => {
    const dateStr = `${calendarMonth.year}-${String(calendarMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (!availableDates.includes(dateStr)) return;
    setSelectedDate(dateStr);
    setSelectedSlot(null);
    setError('');
  };

  const isSelectedDay = (day: number) => {
    if (!selectedDate) return false;
    const [y, m, d] = selectedDate.split('-').map(Number);
    return y === calendarMonth.year && m === calendarMonth.month + 1 && d === day;
  };

  if (step === 'confirmed' && bookingId) {
    return (
      <div className="rounded-2xl bg-card shadow-sm border border-border p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
          <svg className="w-9 h-9 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Booking confirmed</h2>
        <p className="text-slate-700 dark:text-slate-200 mb-6">
          We have sent the details to <strong>{form.guest_email}</strong>.
        </p>
      </div>
    );
  }

  const isScheduleStep = step === 'date' || step === 'time';
  const isDetailsStep = step === 'details';

  return (
    <div className="rounded-2xl bg-card shadow-sm border border-border overflow-hidden">
      {/* Progress indicator */}
      {(isScheduleStep || isDetailsStep) && (
        <div className="px-6 pt-6 pb-2 border-b border-slate-100 dark:border-slate-600">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  isScheduleStep ? 'bg-brand-blue text-white' : 'bg-brand-blue text-white'
                }`}
              >
                {isDetailsStep ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  '1'
                )}
              </span>
              <span className="text-sm font-medium text-slate-900 dark:text-white">Choose a time</span>
            </div>
            <div className="h-0.5 flex-1 min-w-[24px] bg-slate-200 dark:bg-slate-600">
              <div className={`h-full bg-brand-blue transition-all ${isDetailsStep ? 'w-full' : 'w-0'}`} />
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium ${
                  isDetailsStep ? 'border-brand-blue bg-brand-blue text-white' : 'border-slate-200 dark:border-slate-500 text-slate-500 dark:text-slate-400'
                }`}
              >
                2
              </span>
              <span className="text-sm font-medium text-slate-900 dark:text-white">Your information</span>
            </div>
          </div>
        </div>
      )}

      {/* Two-column: Choose a time (calendar | slots) */}
      {isScheduleStep && (
        <div className="flex flex-col md:flex-row min-h-[420px]">
          {/* Left column: event + calendar (fixed width) */}
          <div className="md:w-[320px] shrink-0 bg-brand-olive text-white p-6 flex flex-col">
            <div className="flex flex-col items-center mb-6">
              <h3 className="font-semibold text-center">Meeting: {initialEvent.title}</h3>
              {initialEvent.duration_minutes > 0 && (
                <p className="text-white/90 text-sm mt-1">
                  {initialEvent.duration_minutes} {initialEvent.duration_minutes === 1 ? 'minute' : 'minutes'}
                </p>
              )}
            </div>
            <p className="text-white/90 text-sm text-center mb-4 capitalize">{monthLabel}</p>
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() =>
                  setCalendarMonth((m) =>
                    m.month === 0 ? { year: m.year - 1, month: 11 } : { year: m.year, month: m.month - 1 }
                  )
                }
                className="p-1 rounded hover:bg-white/10"
                aria-label="Previous month"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() =>
                  setCalendarMonth((m) =>
                    m.month === 11 ? { year: m.year + 1, month: 0 } : { year: m.year, month: m.month + 1 }
                  )
                }
                className="p-1 rounded hover:bg-white/10"
                aria-label="Next month"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs uppercase text-white/80 mb-2">
              {WEEKDAYS.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            {datesLoading ? (
              <p className="text-white/70 text-sm py-4">Loading dates…</p>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, i) =>
                  day === null ? (
                    <span key={`e-${i}`} />
                  ) : (
                    <button
                      key={day}
                      type="button"
                      onClick={() => selectDate(day)}
                      disabled={!isDateAvailable(day)}
                      className={`aspect-square rounded-full text-sm flex items-center justify-center ${
                        isSelectedDay(day)
                          ? 'bg-white text-slate-900 dark:text-slate-100 font-semibold'
                          : isDateAvailable(day)
                            ? 'hover:bg-white/20 text-white'
                            : 'text-white/40 cursor-not-allowed'
                      }`}
                    >
                      {day}
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {/* Right column: location, timezone, duration + time slots (white bg, stable width) */}
          <div className="flex-1 min-w-[300px] p-6 flex flex-col bg-white dark:bg-slate-800">
            {initialEvent.location_address?.trim() && (
              <div className="mb-4">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-200 uppercase tracking-wide mb-1">Meeting location</p>
                <p className="text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <span className="text-slate-500 dark:text-slate-300 shrink-0" aria-hidden>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </span>
                  {initialEvent.location_address.trim().startsWith('http') ? (
                    <a href={initialEvent.location_address.trim()} target="_blank" rel="noopener noreferrer" className="text-brand-blue hover:underline">
                      {initialEvent.location_address.trim()}
                    </a>
                  ) : (
                    <span>{initialEvent.location_address.trim()}</span>
                  )}
                </p>
              </div>
            )}
            {initialEvent.timezone?.trim() && (
              <div className="mb-4">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-200 uppercase tracking-wide mb-1">Timezone</p>
                <p className="text-slate-900 dark:text-white text-sm">{initialEvent.timezone.trim()}</p>
              </div>
            )}
            <div className="mb-4">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-200 uppercase tracking-wide mb-1">Meeting duration</p>
              <p className="text-slate-900 dark:text-white">
                {initialEvent.duration_minutes} {initialEvent.duration_minutes === 1 ? 'minute' : 'minutes'}
              </p>
            </div>
            <div className="mb-6">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-200 uppercase tracking-wide mb-2">What time works for you?</p>
              {!selectedDate ? (
                <p className="text-slate-600 dark:text-slate-200 text-sm">Select a date on the calendar.</p>
              ) : (
                <>
                  <p className="text-slate-800 dark:text-white text-sm mb-3">
                    Showing times for {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">{Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
                  {slotsLoading ? (
                    <p className="text-slate-600 dark:text-slate-200">Loading times…</p>
                  ) : slots.length === 0 ? (
                    <p className="text-slate-600 dark:text-slate-200">No times available for this day.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {slots.map((slot) => (
                        <button
                          key={slot.start}
                          type="button"
                          onClick={() => handleSelectSlot(slot)}
                          className="py-2.5 px-4 rounded-lg border border-slate-200 dark:border-slate-500 bg-white dark:bg-slate-700 hover:border-brand-green hover:bg-brand-green-light dark:hover:bg-slate-600 text-sm font-medium text-slate-900 dark:text-white transition-colors"
                        >
                          {formatSlotTime(slot.start)} – {formatSlotTime(slot.end)}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Your information step */}
      {step === 'details' && selectedSlot && (
        <div className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Your information</h2>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 p-4 mb-6">
            <p className="text-slate-900 dark:text-white capitalize">
              {formatLongDate(selectedDate)} {formatSlotTime(selectedSlot.start)}
            </p>
            <button
              type="button"
              onClick={() => setStep('time')}
              className="text-brand-blue dark:text-sky-300 hover:underline text-sm font-medium mt-1"
            >
              Edit
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-800 dark:text-slate-100 mb-1.5">Name *</label>
              <input
                type="text"
                required
                value={form.guest_name}
                onChange={(e) => setForm((f) => ({ ...f, guest_name: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-800 dark:text-slate-100 mb-1.5">Email address *</label>
              <input
                type="email"
                required
                value={form.guest_email}
                onChange={(e) => setForm((f) => ({ ...f, guest_email: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                placeholder="you@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-800 dark:text-slate-100 mb-1.5">Phone</label>
              <PhoneInput
                international
                defaultCountry="EC"
                value={form.guest_phone || undefined}
                onChange={(value) => setForm((f) => ({ ...f, guest_phone: value || '' }))}
                placeholder="Optional"
                className="phone-input rounded-lg border border-slate-200 focus-within:ring-2 focus-within:ring-brand-blue focus-within:border-brand-blue dark:border-slate-600 dark:bg-slate-700 [&_.PhoneInputInput]:px-4 [&_.PhoneInputInput]:py-2.5 [&_.PhoneInputInput]:border-0 [&_.PhoneInputInput]:outline-none [&_.PhoneInputCountrySelectArrow]:hidden"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-800 dark:text-slate-100 mb-1.5">Number of attendees</label>
              <input
                type="number"
                min={1}
                value={form.number_of_attendees}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    number_of_attendees: Math.max(1, Number(e.target.value) || 1),
                  }))
                }
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
              />
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">How many people will attend this appointment.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-800 dark:text-slate-100 mb-1.5">Comments</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                placeholder="Optional"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('time')}
                className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-medium hover:bg-slate-100 dark:hover:bg-slate-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <button
                type="submit"
                disabled={submitLoading}
                className="flex-1 py-3 rounded-xl bg-brand-blue text-white font-medium hover:bg-brand-blue-hover disabled:opacity-50 transition-colors"
              >
                {submitLoading ? 'Booking…' : 'Confirm appointment'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
