'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import type {
  AppointmentEvent,
  BookingWithEvent,
  EventAvailabilityDate,
} from '@/lib/appointments/queries';
import { TIMEZONE_OPTIONS } from '@/lib/timezones';

/** Genera un slug URL-friendly desde el título (minúsculas, guiones, sin acentos). */
function slugify(title: string): string {
  if (!title.trim()) return '';
  return title
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function AppointmentsAdminClient() {
  const [events, setEvents] = useState<AppointmentEvent[]>([]);
  const [bookings, setBookings] = useState<BookingWithEvent[]>([]);
  const [tab, setTab] = useState<'events' | 'bookings'>('events');
  const [loading, setLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  const [newEvent, setNewEvent] = useState({
    title: '',
    slug: '',
    description: '',
    duration_minutes: 30,
    max_per_slot: 1,
    notification_email: '',
    location_address: '',
    timezone: '',
  });
  const [newEventSpecificDates, setNewEventSpecificDates] = useState<EventAvailabilityDate[]>(() => {
    const today = new Date().toISOString().slice(0, 10);
    return [{ availability_date: today, start_time: '09:00', end_time: '18:00' }];
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [editingEvent, setEditingEvent] = useState<AppointmentEvent | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    slug: '',
    description: '',
    duration_minutes: 30,
    max_per_slot: 1,
    notification_email: '',
    location_address: '',
    timezone: '',
  });
  const [editFormSpecificDates, setEditFormSpecificDates] = useState<EventAvailabilityDate[]>(() => {
    const today = new Date().toISOString().slice(0, 10);
    return [{ availability_date: today, start_time: '09:00', end_time: '18:00' }];
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editAvailabilityLoading, setEditAvailabilityLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deletingBookingId, setDeletingBookingId] = useState<number | null>(null);
  const [syncingCalendarId, setSyncingCalendarId] = useState<number | null>(null);
  const [syncCalendarError, setSyncCalendarError] = useState<string | null>(null);
  const [copyFeedbackId, setCopyFeedbackId] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/appointments/admin/events')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setEvents(data);
        else if (data?.error) setEvents([]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab !== 'bookings') return;
    setBookingsLoading(true);
    const from = new Date();
    from.setMonth(from.getMonth() - 1);
    const fromStr = from.toISOString().slice(0, 10);
    fetch(`/api/appointments/admin/bookings?from=${fromStr}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setBookings(data);
        setBookingsLoading(false);
      })
      .catch(() => setBookingsLoading(false));
  }, [tab]);

  const addNewEventDate = () => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10);
    setNewEventSpecificDates((prev) => [...prev, { availability_date: dateStr, start_time: '09:00', end_time: '18:00' }]);
  };
  const updateNewEventDate = (index: number, field: keyof EventAvailabilityDate, value: string) => {
    setNewEventSpecificDates((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };
  const removeNewEventDate = (index: number) => {
    setNewEventSpecificDates((prev) => prev.filter((_, i) => i !== index));
  };

  const addEditFormDate = () => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10);
    setEditFormSpecificDates((prev) => [...prev, { availability_date: dateStr, start_time: '09:00', end_time: '18:00' }]);
  };
  const updateEditFormDate = (index: number, field: keyof EventAvailabilityDate, value: string) => {
    setEditFormSpecificDates((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };
  const removeEditFormDate = (index: number) => {
    setEditFormSpecificDates((prev) => prev.filter((_, i) => i !== index));
  };

  const startEditing = (ev: AppointmentEvent) => {
    setEditingEvent(ev);
    setEditForm({
      title: ev.title,
      slug: ev.slug,
      description: ev.description ?? '',
      duration_minutes: ev.duration_minutes,
      max_per_slot: ev.max_per_slot ?? 1,
      notification_email: ev.notification_email ?? '',
      location_address: ev.location_address ?? '',
      timezone: ev.timezone ?? '',
    });
    setEditError('');
    setEditAvailabilityLoading(true);
    fetch(`/api/appointments/admin/events/${ev.id}/availability`)
      .then((res) => res.json())
      .then((data) => {
        const dates = Array.isArray(data.specificDates) && data.specificDates.length > 0
          ? data.specificDates
          : (() => {
              const today = new Date().toISOString().slice(0, 10);
              return [{ availability_date: today, start_time: '09:00', end_time: '18:00' }];
            })();
        setEditFormSpecificDates(dates);
      })
      .catch(() => {
        const today = new Date().toISOString().slice(0, 10);
        setEditFormSpecificDates([{ availability_date: today, start_time: '09:00', end_time: '18:00' }]);
      })
      .finally(() => setEditAvailabilityLoading(false));
  };

  const cancelEditing = () => {
    setEditingEvent(null);
    setEditError('');
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
    const validDates = editFormSpecificDates.filter((d) => d.availability_date?.trim() && d.start_time?.trim() && d.end_time?.trim());
    if (validDates.length === 0) {
      setEditError('Add at least one specific date with time range.');
      return;
    }
    setEditError('');
    setEditSaving(true);
    try {
      const res = await fetch(`/api/appointments/admin/events/${editingEvent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editForm.title,
          slug: editForm.slug || undefined,
          description: editForm.description || undefined,
          duration_minutes: editForm.duration_minutes,
          max_per_slot: editForm.max_per_slot,
          notification_email: editForm.notification_email?.trim() || undefined,
          location_address: editForm.location_address?.trim() || undefined,
          timezone: editForm.timezone?.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || 'Error saving');
        setEditSaving(false);
        return;
      }
      const availRes = await fetch(`/api/appointments/admin/events/${editingEvent.id}/availability`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ windows: [], specificDates: validDates }),
      });
      if (!availRes.ok) {
        setEditError('Event saved but failed to update schedule.');
        setEditSaving(false);
        return;
      }
      setEvents((prev) => prev.map((ev) => (ev.id === editingEvent.id ? data : ev)));
      setEditingEvent(null);
    } catch {
      setEditError('Connection error');
    }
    setEditSaving(false);
  };

  const handleDeleteEvent = async (ev: AppointmentEvent) => {
    if (!confirm(`Delete event "${ev.title}"? It will be hidden from the list and no new bookings will be allowed.`)) return;
    setDeletingId(ev.id);
    try {
      const res = await fetch(`/api/appointments/admin/events/${ev.id}`, { method: 'DELETE' });
      if (res.ok) {
        setEvents((prev) => prev.filter((e) => e.id !== ev.id));
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteBooking = async (b: BookingWithEvent) => {
    if (!confirm(`Delete booking for ${b.guest_name} (${b.event_title}, ${formatDateTime(b.start_at)})?`)) return;
    setDeletingBookingId(b.id);
    try {
      const res = await fetch(`/api/appointments/admin/bookings/${b.id}`, { method: 'DELETE' });
      if (res.ok) {
        setBookings((prev) => prev.filter((x) => x.id !== b.id));
      }
    } finally {
      setDeletingBookingId(null);
    }
  };

  const handleSyncToCalendar = async (b: BookingWithEvent) => {
    setSyncCalendarError(null);
    setSyncingCalendarId(b.id);
    try {
      const res = await fetch(`/api/appointments/admin/bookings/${b.id}/sync-calendar`, { method: 'POST' });
      const data = await res.json();
      if (data.ok && data.eventId) {
        setBookings((prev) =>
          prev.map((x) =>
            x.id === b.id ? { ...x, google_calendar_event_id: data.eventId } : x
          )
        );
      } else if (!data.ok && data.reason) {
        const msg = data.message || data.reason;
        setSyncCalendarError(msg);
        setTimeout(() => setSyncCalendarError(null), 5000);
      }
    } catch {
      setSyncCalendarError('Error de conexión');
      setTimeout(() => setSyncCalendarError(null), 5000);
    } finally {
      setSyncingCalendarId(null);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    const validDates = newEventSpecificDates.filter((d) => d.availability_date?.trim() && d.start_time?.trim() && d.end_time?.trim());
    if (validDates.length === 0) {
      setCreateError('Add at least one specific date with time range.');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/appointments/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newEvent.title,
          slug: newEvent.slug || undefined,
          description: newEvent.description || undefined,
          duration_minutes: newEvent.duration_minutes,
          max_per_slot: newEvent.max_per_slot >= 1 ? newEvent.max_per_slot : 1,
          notification_email: newEvent.notification_email?.trim() || undefined,
          location_address: newEvent.location_address?.trim() || undefined,
          timezone: newEvent.timezone?.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || 'Error al crear');
        setCreating(false);
        return;
      }
      setEvents((prev) => [...prev, data]);
      const eventId = data.id;
      const availRes = await fetch(`/api/appointments/admin/events/${eventId}/availability`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ windows: [], specificDates: validDates }),
      });
      if (!availRes.ok) {
        console.error('Event created but failed to save schedule:', await availRes.text());
      }
      setNewEvent({ title: '', slug: '', description: '', duration_minutes: 30, max_per_slot: 1, notification_email: '', location_address: '', timezone: '' });
      setNewEventSpecificDates(() => {
        const today = new Date().toISOString().slice(0, 10);
        return [{ availability_date: today, start_time: '09:00', end_time: '18:00' }];
      });
    } catch {
      setCreateError('Error de conexión');
    }
    setCreating(false);
  };

  const formatDateTime = (s: string) => {
    const d = new Date(s.replace(' ', 'T'));
    return d.toLocaleString('en', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow border border-slate-200 overflow-hidden">
      <div className="border-b border-slate-200 flex">
        <button
          type="button"
          onClick={() => setTab('events')}
          className={`flex-1 py-4 px-4 font-medium ${
            tab === 'events'
              ? 'bg-brand-olive text-white'
              : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          Events
        </button>
        <button
          type="button"
          onClick={() => setTab('bookings')}
          className={`flex-1 py-4 px-4 font-medium ${
            tab === 'bookings'
              ? 'bg-brand-olive text-white'
              : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          Bookings
        </button>
      </div>

      <div className="p-6">
        {tab === 'events' && (
          <>
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Create new appointment type</h2>
            <form onSubmit={handleCreateEvent} className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={newEvent.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setNewEvent((prev) => ({
                      ...prev,
                      title,
                      slug: slugify(title),
                    }));
                  }}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200"
                  placeholder="e.g. ITB 2026 Berlin"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Slug (URL)</label>
                <input
                  type="text"
                  value={newEvent.slug}
                  onChange={(e) => setNewEvent((prev) => ({ ...prev, slug: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200"
                  placeholder="consulta-15-min"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Filled automatically from the title. Direct link: /[slug]
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Duration (min)</label>
                <input
                  type="number"
                  min={5}
                  step={5}
                  value={newEvent.duration_minutes}
                  onChange={(e) =>
                    setNewEvent((prev) => ({ ...prev, duration_minutes: Number(e.target.value) || 30 }))
                  }
                  className="w-full px-4 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Capacity per slot</label>
                <input
                  type="number"
                  min={1}
                  value={newEvent.max_per_slot}
                  onChange={(e) =>
                    setNewEvent((prev) => ({ ...prev, max_per_slot: Math.max(1, Number(e.target.value) || 1) }))
                  }
                  className="w-full px-4 py-2 rounded-lg border border-slate-200"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Max number of bookings in the same time slot (1 = one booking per slot, higher = multiple people can book the same slot).
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent((prev) => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email for notifications</label>
                <input
                  type="text"
                  value={newEvent.notification_email}
                  onChange={(e) => setNewEvent((prev) => ({ ...prev, notification_email: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200"
                  placeholder="ejemplo1@correo.com, ejemplo2@correo.com"
                />
                <p className="text-xs text-slate-500 mt-1">
                  When someone books this appointment, a notification will be sent to these addresses (separate with commas).
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  <Link
                    href="/admin/instrucciones-correo"
                    className="text-brand-blue hover:underline"
                  >
                    How to configure email sending (Mailjet, env variables)
                  </Link>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location (address)</label>
                <input
                  type="text"
                  value={newEvent.location_address}
                  onChange={(e) => setNewEvent((prev) => ({ ...prev, location_address: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200"
                  placeholder="e.g. Av. 123, City or Google Meet link"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Optional. You can paste an address or a meeting link. To pick on map, search the address in{' '}
                  <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer" className="text-brand-blue hover:underline">
                    Google Maps
                  </a>
                  {' '}and copy it here.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
                <select
                  value={newEvent.timezone}
                  onChange={(e) => setNewEvent((prev) => ({ ...prev, timezone: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200"
                >
                  {TIMEZONE_OPTIONS.map((opt) => (
                    <option key={opt.value || 'empty'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Timezone where the event takes place (e.g. Europe/Berlin for ITB Berlin). Slot times and Google Calendar use this so the event shows correctly for everyone (e.g. 09:00 Berlin appears as 03:00 for someone in Ecuador).
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Specific dates *</label>
                <p className="text-xs text-slate-500 mb-2">
                  Add the dates and time windows when this event can be booked. Times are in the event&apos;s timezone (see Timezone above). At least one is required.
                </p>
                <div className="space-y-2 max-w-2xl mb-2">
                  {newEventSpecificDates.map((d, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2">
                      <input
                        type="date"
                        value={d.availability_date}
                        onChange={(e) => updateNewEventDate(i, 'availability_date', e.target.value)}
                        className="rounded border border-slate-200 px-2 py-1 text-sm"
                      />
                      <input
                        type="time"
                        value={d.start_time}
                        onChange={(e) => updateNewEventDate(i, 'start_time', e.target.value)}
                        className="rounded border border-slate-200 px-2 py-1 text-sm"
                      />
                      <span className="text-slate-400">to</span>
                      <input
                        type="time"
                        value={d.end_time}
                        onChange={(e) => updateNewEventDate(i, 'end_time', e.target.value)}
                        className="rounded border border-slate-200 px-2 py-1 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeNewEventDate(i)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addNewEventDate}
                  className="py-1.5 px-3 rounded-lg border border-slate-300 text-slate-700 text-sm hover:bg-slate-100"
                >
                  + Add date
                </button>
              </div>
              {createError && <p className="text-sm text-red-600">{createError}</p>}
              <button
                type="submit"
                disabled={creating}
                className="py-2 px-4 rounded-lg bg-brand-blue text-white font-medium hover:bg-brand-blue-hover disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create event'}
              </button>
            </form>

            <h2 className="text-lg font-semibold text-slate-800 mt-8 mb-4">Appointment types</h2>

            {editingEvent && (
              <div className="mb-6 p-4 rounded-xl border border-brand-green bg-brand-green-light">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Edit event</h3>
                <form onSubmit={handleSaveEvent} className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                    <input
                      type="text"
                      required
                      value={editForm.title}
                      onChange={(e) => {
                        const title = e.target.value;
                        setEditForm((prev) => ({ ...prev, title, slug: slugify(title) }));
                      }}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Slug (URL)</label>
                    <input
                      type="text"
                      value={editForm.slug}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, slug: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Duration (min)</label>
                    <input
                      type="number"
                      min={5}
                      step={5}
                      value={editForm.duration_minutes}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, duration_minutes: Number(e.target.value) || 30 }))
                      }
                      className="w-full px-4 py-2 rounded-lg border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Capacity per slot</label>
                    <input
                      type="number"
                      min={1}
                      value={editForm.max_per_slot}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, max_per_slot: Math.max(1, Number(e.target.value) || 1) }))
                      }
                      className="w-full px-4 py-2 rounded-lg border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                      rows={2}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email for notifications</label>
                    <input
                      type="text"
                      value={editForm.notification_email}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, notification_email: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200"
                      placeholder="ejemplo1@correo.com, ejemplo2@correo.com"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Separate multiple emails with commas.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Location (address)</label>
                    <input
                      type="text"
                      value={editForm.location_address}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, location_address: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200"
                      placeholder="e.g. Av. 123, City or Google Meet link"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
                    <select
                      value={editForm.timezone}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, timezone: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200"
                    >
                      {TIMEZONE_OPTIONS.map((opt) => (
                        <option key={opt.value || 'empty'} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1">
                      Timezone where the event takes place. Slot times and Google Calendar use this so the event shows in the correct local time for everyone.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Specific dates *</label>
                    <p className="text-xs text-slate-500 mb-2">
                      Add the dates and time windows when this event can be booked. Times are in the event&apos;s timezone (see Timezone above). At least one is required.
                    </p>
                    {editAvailabilityLoading ? (
                      <p className="text-sm text-slate-500">Loading dates…</p>
                    ) : (
                      <>
                        <div className="space-y-2 max-w-2xl mb-2">
                          {editFormSpecificDates.map((d, i) => (
                            <div key={i} className="flex flex-wrap items-center gap-2">
                              <input
                                type="date"
                                value={d.availability_date}
                                onChange={(e) => updateEditFormDate(i, 'availability_date', e.target.value)}
                                className="rounded border border-slate-200 px-2 py-1 text-sm"
                              />
                              <input
                                type="time"
                                value={d.start_time}
                                onChange={(e) => updateEditFormDate(i, 'start_time', e.target.value)}
                                className="rounded border border-slate-200 px-2 py-1 text-sm"
                              />
                              <span className="text-slate-400">to</span>
                              <input
                                type="time"
                                value={d.end_time}
                                onChange={(e) => updateEditFormDate(i, 'end_time', e.target.value)}
                                className="rounded border border-slate-200 px-2 py-1 text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => removeEditFormDate(i)}
                                className="text-sm text-red-600 hover:underline"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={addEditFormDate}
                          className="py-1.5 px-3 rounded-lg border border-slate-300 text-slate-700 text-sm hover:bg-slate-100"
                        >
                          + Add date
                        </button>
                      </>
                    )}
                  </div>
                  {editError && <p className="text-sm text-red-600">{editError}</p>}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={editSaving || editAvailabilityLoading}
                      className="py-2 px-4 rounded-lg bg-brand-blue text-white font-medium hover:bg-brand-blue-hover disabled:opacity-50"
                    >
                      {editSaving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="py-2 px-4 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {loading ? (
              <p className="text-slate-500">Loading…</p>
            ) : events.length === 0 ? (
              <p className="text-slate-500">No events yet. Create one above.</p>
            ) : (
              <ul className="space-y-2">
                {events.map((ev) => (
                  <li
                    key={ev.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2 px-4 rounded-lg bg-slate-50 border border-slate-200"
                  >
                    <div>
                      <span className="font-medium text-slate-800">{ev.title}</span>
                      <span className="text-slate-500 text-sm ml-2">{ev.duration_minutes} min</span>
                      <span className="text-slate-500 text-sm ml-2">· {ev.max_per_slot ?? 1} booking(s)/slot</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600">/{ev.slug}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const url = typeof window !== 'undefined' ? `${window.location.origin}/${ev.slug}` : '';
                          navigator.clipboard?.writeText(url).then(() => {
                            setCopyFeedbackId(ev.id);
                            setTimeout(() => setCopyFeedbackId(null), 2000);
                          });
                        }}
                        className="p-1.5 rounded text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                        title="Copy link"
                        aria-label="Copy link"
                      >
                        {copyFeedbackId === ev.id ? (
                          <span className="text-xs text-foreground">Copied!</span>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                          </svg>
                        )}
                      </button>
                      <a
                        href={`/${ev.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-brand-blue hover:underline"
                      >
                        Open
                      </a>
                      <button
                        type="button"
                        onClick={() => startEditing(ev)}
                        className="p-1.5 rounded text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                        title="Edit"
                        aria-label="Edit"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(ev)}
                        disabled={deletingId === ev.id}
                        className="p-1.5 rounded text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        title="Delete"
                        aria-label="Delete"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {tab === 'bookings' && (
          <>
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Recent bookings</h2>
            {syncCalendarError && (
              <p className="mb-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {syncCalendarError}
              </p>
            )}
            {bookingsLoading ? (
              <p className="text-slate-500">Loading…</p>
            ) : bookings.length === 0 ? (
              <p className="text-slate-500">No bookings yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-600">
                      <th className="py-2 pr-4">Date and time</th>
                      <th className="py-2 pr-4">Event</th>
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4">Phone</th>
                      <th className="py-2 pr-4">Attendees</th>
                      <th className="py-2 min-w-[8rem]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id} className="border-b border-slate-100">
                        <td className="py-3 pr-4 text-slate-700">{formatDateTime(b.start_at)}</td>
                        <td className="py-3 pr-4">{b.event_title}</td>
                        <td className="py-3 pr-4">{b.guest_name}</td>
                        <td className="py-3 pr-4">{b.guest_email}</td>
                        <td className="py-3 pr-4">{b.guest_phone || '—'}</td>
                        <td className="py-3 pr-4">{b.number_of_attendees != null ? b.number_of_attendees : '—'}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-1">
                            {!b.google_calendar_event_id && (
                              <button
                                type="button"
                                onClick={() => handleSyncToCalendar(b)}
                                disabled={syncingCalendarId === b.id}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
                                title="Create event in Google Calendar"
                                aria-label="Add to Calendar"
                              >
                                {syncingCalendarId === b.id ? (
                                  <span className="text-slate-500">…</span>
                                ) : (
                                  <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                                      <line x1="16" x2="16" y1="2" y2="6" />
                                      <line x1="8" x2="8" y1="2" y2="6" />
                                      <line x1="3" x2="21" y1="10" y2="10" />
                                    </svg>
                                    <span>Add to Calendar</span>
                                  </>
                                )}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteBooking(b)}
                              disabled={deletingBookingId === b.id}
                              className="p-1.5 rounded text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                              title="Delete booking"
                              aria-label="Delete booking"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                <line x1="10" y1="11" x2="10" y2="17" />
                                <line x1="14" y1="11" x2="14" y2="17" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
