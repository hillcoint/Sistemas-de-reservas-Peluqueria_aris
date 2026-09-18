import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

    const STORAGE_KEY = 'aris-reservas-v1';
    const CATALOG_KEY = 'aris-catalogo-v1';
    const cabins = [
      { name: 'Cabina 1', equipment: 'Sillón de peluquería y lavacabezas' },
      { name: 'Cabina 2', equipment: 'Sillón de peluquería y lavacabezas' },
      { name: 'Cabina 3', equipment: 'Camilla facial y vapor' },
      { name: 'Cabina 4', equipment: 'Camilla de masaje' },
      { name: 'Cabina 5', equipment: 'Mesa de manicura' },
      { name: 'Cabina 6', equipment: 'Pedicura y espacio polivalente' }
    ];
    const therapists = [
      { id: 'laura', name: 'Laura Martín', specialty: 'Peluquería', treatments: ['corte', 'color'], color: 'bg-rose-100 text-rose-700' },
      { id: 'marta', name: 'Marta Ruiz', specialty: 'Estética', treatments: ['facial', 'masaje'], color: 'bg-violet-100 text-violet-700' },
      { id: 'ines', name: 'Inés Gómez', specialty: 'Uñas', treatments: ['manicura', 'pedicura'], color: 'bg-amber-100 text-amber-700' },
      { id: 'sara', name: 'Sara León', specialty: 'Bienestar', treatments: ['facial', 'masaje', 'pedicura'], color: 'bg-emerald-100 text-emerald-700' }
    ];
    const defaultTreatments = [
      { id: 'corte', name: 'Corte y peinado', duration: 60, price: 32, compatibleCabins: ['Cabina 1', 'Cabina 2'], equipment: 'Sillón y lavacabezas' },
      { id: 'color', name: 'Coloración', duration: 120, price: 58, compatibleCabins: ['Cabina 1', 'Cabina 2'], equipment: 'Sillón y lavacabezas' },
      { id: 'facial', name: 'Higiene facial', duration: 60, price: 45, compatibleCabins: ['Cabina 3', 'Cabina 6'], equipment: 'Camilla y vapor facial' },
      { id: 'masaje', name: 'Masaje relajante', duration: 60, price: 50, compatibleCabins: ['Cabina 4', 'Cabina 6'], equipment: 'Camilla de masaje' },
      { id: 'manicura', name: 'Manicura semipermanente', duration: 45, price: 28, compatibleCabins: ['Cabina 5', 'Cabina 6'], equipment: 'Mesa de manicura' },
      { id: 'pedicura', name: 'Pedicura completa', duration: 60, price: 35, compatibleCabins: ['Cabina 6'], equipment: 'Sillón de pedicura' }
    ];

    function loadCatalog() {
      try {
        const stored = localStorage.getItem(CATALOG_KEY);
        if (stored) return JSON.parse(stored);
        localStorage.setItem(CATALOG_KEY, JSON.stringify(defaultTreatments));
      } catch {}
      return defaultTreatments;
    }
    const treatments = loadCatalog();

    const todayISO = () => {
      const now = new Date();
      return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    };

    const seedReservations = () => {
      const today = todayISO();
      return [
        { id: crypto.randomUUID(), date: today, time: '09:00', client: 'Ana López', phone: '600 123 456', treatmentId: 'corte', therapistId: 'laura', cabin: 'Cabina 1', notes: '', status: 'confirmed' },
        { id: crypto.randomUUID(), date: today, time: '10:30', client: 'Carmen Díaz', phone: '611 234 567', treatmentId: 'facial', therapistId: 'marta', cabin: 'Cabina 3', notes: 'Piel sensible', status: 'confirmed' },
        { id: crypto.randomUUID(), date: today, time: '12:00', client: 'Lucía Pérez', phone: '622 345 678', treatmentId: 'manicura', therapistId: 'ines', cabin: 'Cabina 5', notes: '', status: 'pending' }
      ];
    };

    function loadReservations() {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : seedReservations();
      } catch {
        return seedReservations();
      }
    }

    const minutesFromTime = (time) => {
      const [hour, minute] = time.split(':').map(Number);
      return hour * 60 + minute;
    };

    const addMinutes = (time, duration) => {
      const total = minutesFromTime(time) + duration;
      return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    };

    function findAutomaticAssignment(candidate, reservations) {
      const treatment = treatments.find((item) => item.id === candidate.treatmentId);
      const availableTherapists = therapists.filter((person) => person.treatments.includes(candidate.treatmentId));
      const start = minutesFromTime(candidate.time);
      const end = start + treatment.duration;

      for (const person of availableTherapists) {
        for (const cabin of treatment.compatibleCabins) {
          const conflict = reservations.some((item) => {
            if (item.id === candidate.id || item.date !== candidate.date || item.status === 'cancelled') return false;
            const otherTreatment = treatments.find((entry) => entry.id === item.treatmentId);
            const otherStart = minutesFromTime(item.time);
            const otherEnd = otherStart + otherTreatment.duration;
            const overlaps = start < otherEnd && end > otherStart;
            return overlaps && (item.cabin === cabin || item.therapistId === person.id);
          });
          if (!conflict) return { therapistId: person.id, cabin };
        }
      }
      return null;
    }

    function App() {
      const [reservations, setReservations] = useState(loadReservations);
      const [selectedDate, setSelectedDate] = useState(todayISO());
      const [activeView, setActiveView] = useState('agenda');
      const [isModalOpen, setModalOpen] = useState(false);
      const [editingId, setEditingId] = useState(null);
      const [toast, setToast] = useState('');

      useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(reservations)), [reservations]);
      useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(''), 2800);
        return () => clearTimeout(timer);
      }, [toast]);

      const dayReservations = useMemo(() => reservations
        .filter((reservation) => reservation.date === selectedDate && reservation.status !== 'cancelled')
        .sort((a, b) => a.time.localeCompare(b.time)), [reservations, selectedDate]);

      const totalIncome = dayReservations.reduce((sum, item) => {
        const treatment = treatments.find((entry) => entry.id === item.treatmentId);
        return sum + (treatment?.price || 0);
      }, 0);

      const shareWhatsApp = () => {
        const lines = dayReservations.map((item) => {
          const treatment = treatments.find((entry) => entry.id === item.treatmentId);
          const therapist = therapists.find((entry) => entry.id === item.therapistId);
          return `• ${item.time} · ${item.client} · ${treatment.name} · ${therapist.name} · ${item.cabin}`;
        });
        const message = [`Reservas Aris Beauty — ${formatDay}`, '', ...(lines.length ? lines : ['Sin reservas']), '', `Total: ${dayReservations.length} citas`].join('\n');
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
      };

      const openNew = () => {
        setEditingId(null);
        setModalOpen(true);
      };

      const removeReservation = (id) => {
        if (!confirm('¿Quieres eliminar esta reserva?')) return;
        setReservations((current) => current.filter((item) => item.id !== id));
        setToast('Reserva eliminada');
      };

      const changeStatus = (id) => {
        setReservations((current) => current.map((item) => item.id === id
          ? { ...item, status: item.status === 'confirmed' ? 'pending' : 'confirmed' }
          : item));
      };

      const formatDay = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
        .format(new Date(`${selectedDate}T12:00:00`));

      return (
        <div className="min-h-screen">
          <header className="border-b border-stone-200 bg-white/90 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-2xl bg-ink text-lg font-black text-blush shadow-sm">
                  <span className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-blush/30"></span>
                  <span className="relative">A</span>
                </div>
                <div>
                  <p className="font-bold leading-tight">Aris Beauty</p>
                  <p className="text-sm text-stone-500">Agenda del centro</p>
                </div>
              </div>
              <button onClick={openNew} className="rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-plum focus:outline-none focus:ring-4 focus:ring-blush">
                <span className="mr-1 text-lg">＋</span> Nueva reserva
              </button>
            </div>
          </header>

          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
            <section className="relative mb-7 overflow-hidden rounded-[2rem] bg-ink shadow-soft">
              <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-blush/10"></div>
              <div className="absolute bottom-0 left-1/3 h-28 w-28 rounded-full bg-white/5"></div>
              <div className="grid min-h-[300px] lg:grid-cols-[1.25fr_.75fr]">
                <div className="relative z-10 flex flex-col justify-center px-6 py-9 sm:px-10 lg:py-12">
                  <p className="mb-2 text-xs font-bold uppercase tracking-[.22em] text-blush">Belleza · Estética · Uñas</p>
                  <h1 className="max-w-2xl text-3xl font-black tracking-tight text-white sm:text-5xl">Una agenda tan cuidada como tus clientes</h1>
                  <p className="mt-4 max-w-xl text-base leading-relaxed text-stone-300">Organiza profesionales, cabinas y tratamientos sin huecos inesperados ni reservas duplicadas.</p>
                  <label className="mt-7 flex w-full max-w-xs items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-lg">
                    <span className="text-sm font-bold text-ink">Fecha</span>
                    <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-ink outline-none" />
                  </label>
                </div>
                <div className="relative min-h-[210px] lg:min-h-[300px]">
                  <div className="absolute inset-x-0 top-0 z-10 h-20 bg-gradient-to-b from-ink to-transparent lg:inset-y-0 lg:left-0 lg:h-auto lg:w-28 lg:bg-gradient-to-r"></div>
                  <img src={`${import.meta.env.BASE_URL}beauty-hero.webp`} alt="Ilustración de peluquería, estética, manicura y spa" className="absolute inset-0 h-full w-full object-cover object-[center_38%]" />
                </div>
              </div>
            </section>

            <section className="mb-7 grid gap-4 sm:grid-cols-3">
              <Stat label="Citas del día" value={dayReservations.length} hint="reservas activas" />
              <Stat label="Cabinas libres" value={`${Math.max(0, 6 - new Set(dayReservations.map((item) => item.cabin)).size)}/6`} hint="sin uso hoy" />
              <Stat label="Previsión" value={`${totalIncome} €`} hint="servicios reservados" />
            </section>

            <div className="mb-5 flex gap-2 overflow-x-auto rounded-2xl border border-stone-200 bg-white p-1.5 shadow-sm">
              {[
                ['agenda', 'Agenda'],
                ['cabinas', 'Cabinas'],
                ['equipo', 'Equipo'],
                ['tratamientos', 'Tratamientos']
              ].map(([id, label]) => (
                <button key={id} onClick={() => setActiveView(id)} className={`min-w-max rounded-xl px-4 py-2 text-sm font-bold transition ${activeView === id ? 'bg-ink text-white' : 'text-stone-500 hover:bg-stone-100'}`}>
                  {label}
                </button>
              ))}
            </div>

            {activeView === 'agenda' && (
              <AgendaView reservations={dayReservations} formatDay={formatDay} onEdit={(id) => { setEditingId(id); setModalOpen(true); }} onDelete={removeReservation} onStatus={changeStatus} onNew={openNew} onShare={shareWhatsApp} />
            )}
            {activeView === 'cabinas' && <CabinsView reservations={dayReservations} selectedDate={selectedDate} />}
            {activeView === 'equipo' && <TeamView reservations={dayReservations} />}
            {activeView === 'tratamientos' && <TreatmentsView />}
          </main>

          {isModalOpen && (
            <ReservationModal
              reservation={editingId ? reservations.find((item) => item.id === editingId) : null}
              selectedDate={selectedDate}
              reservations={reservations}
              onClose={() => setModalOpen(false)}
              onSave={(reservation) => {
                setReservations((current) => editingId
                  ? current.map((item) => item.id === editingId ? reservation : item)
                  : [...current, reservation]);
                setModalOpen(false);
                setToast(editingId ? 'Reserva actualizada' : 'Reserva creada correctamente');
              }}
            />
          )}

          {toast && <div role="status" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-ink px-5 py-3 text-sm font-bold text-white shadow-xl">✓ {toast}</div>}
        </div>
      );
    }

    function Stat({ label, value, hint }) {
      return (
        <article className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <span className="absolute -right-5 -top-5 h-16 w-16 rounded-full bg-blush/20"></span>
          <p className="text-sm font-bold text-stone-500">{label}</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <strong className="text-3xl font-black">{value}</strong>
            <span className="text-xs text-stone-400">{hint}</span>
          </div>
        </article>
      );
    }

    function AgendaView({ reservations, formatDay, onEdit, onDelete, onStatus, onNew, onShare }) {
      return (
        <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-soft">
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
            <div>
              <h2 className="text-lg font-black capitalize">{formatDay}</h2>
              <p className="text-sm text-stone-500">Citas ordenadas por hora</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden rounded-full bg-blush/50 px-3 py-1 text-xs font-bold sm:inline">{reservations.length} citas</span>
              <button onClick={onShare} className="rounded-xl bg-[#25D366] px-3 py-2 text-xs font-black text-white transition hover:bg-[#1fb85a]">WhatsApp</button>
            </div>
          </div>
          {reservations.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-stone-100 text-2xl">✦</div>
              <h3 className="font-black">Día libre de reservas</h3>
              <p className="mb-5 mt-1 text-sm text-stone-500">Añade la primera cita para esta fecha.</p>
              <button onClick={onNew} className="rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white">Nueva reserva</button>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {reservations.map((reservation) => {
                const treatment = treatments.find((item) => item.id === reservation.treatmentId);
                const therapist = therapists.find((item) => item.id === reservation.therapistId);
                return (
                  <article key={reservation.id} className="group grid gap-4 px-5 py-5 transition hover:bg-stone-50 md:grid-cols-[90px_1.2fr_1fr_auto] md:items-center">
                    <div>
                      <p className="text-xl font-black">{reservation.time}</p>
                      <p className="text-xs text-stone-400">hasta {addMinutes(reservation.time, treatment.duration)}</p>
                    </div>
                    <div>
                      <p className="font-black">{reservation.client}</p>
                      <p className="text-sm text-stone-500">{treatment.name} · {treatment.duration} min</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${therapist.color}`}>{therapist.name}</span>
                      <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-600">{reservation.cabin}</span>
                      <button onClick={() => onStatus(reservation.id)} className={`rounded-full px-3 py-1 text-xs font-bold ${reservation.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {reservation.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => onEdit(reservation.id)} aria-label={`Editar reserva de ${reservation.client}`} className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-bold hover:bg-white">Editar</button>
                      <button onClick={() => onDelete(reservation.id)} aria-label={`Eliminar reserva de ${reservation.client}`} className="rounded-lg px-3 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50">Eliminar</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      );
    }

    function CabinsView({ reservations, selectedDate }) {
      const [now, setNow] = useState(new Date());
      useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
      }, []);
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const isToday = selectedDate === todayISO();
      return (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cabins.map((cabin) => {
            const cabinReservations = reservations.filter((item) => item.cabin === cabin.name);
            const activeReservation = isToday && cabinReservations.find((item) => {
              const service = treatments.find((entry) => entry.id === item.treatmentId);
              const start = minutesFromTime(item.time);
              return nowMinutes >= start && nowMinutes < start + service.duration;
            });
            return (
              <article key={cabin.name} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="font-black">{cabin.name}</h2>
                    <p className="mt-1 text-xs text-stone-400">{cabin.equipment}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${activeReservation ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{!isToday ? `${cabinReservations.length} citas` : activeReservation ? 'Ocupada ahora' : 'Libre ahora'}</span>
                </div>
                {cabinReservations.length ? cabinReservations.map((item) => (
                  <div key={item.id} className="mb-2 rounded-xl bg-stone-50 p-3 text-sm">
                    <p className="font-bold">{item.time} · {item.client}</p>
                    <p className="text-stone-500">{treatments.find((t) => t.id === item.treatmentId).name}</p>
                  </div>
                )) : <p className="text-sm text-stone-400">Sin reservas para este día</p>}
              </article>
            );
          })}
        </section>
      );
    }

    function TeamView({ reservations }) {
      return (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {therapists.map((person) => {
            const count = reservations.filter((item) => item.therapistId === person.id).length;
            return (
              <article key={person.id} className="rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm">
                <div className={`mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full text-lg font-black ${person.color}`}>{person.name.split(' ').map((word) => word[0]).join('')}</div>
                <h2 className="font-black">{person.name}</h2>
                <p className="text-sm text-stone-500">{person.specialty}</p>
                <p className="mt-4 rounded-xl bg-stone-50 py-2 text-sm font-bold">{count} citas hoy</p>
                <div className="mt-3 space-y-2 text-left">
                  {reservations.filter((item) => item.therapistId === person.id).map((item) => (
                    <div key={item.id} className="rounded-lg border border-stone-100 px-3 py-2 text-xs">
                      <strong>{item.time}</strong> · {item.client}
                    </div>
                  ))}
                  {!count && <p className="text-center text-xs text-stone-400">Profesional disponible</p>}
                </div>
              </article>
            );
          })}
        </section>
      );
    }

    function TreatmentsView() {
      return (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {treatments.map((treatment) => (
            <article key={treatment.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-black">{treatment.name}</h2>
                <p className="text-sm text-stone-500">{treatment.duration} minutos</p>
              </div>
              <strong className="rounded-xl bg-blush/50 px-3 py-2">{treatment.price} €</strong>
              </div>
              <div className="mt-4 border-t border-stone-100 pt-4 text-xs text-stone-500">
                <p><strong className="text-ink">Equipamiento:</strong> {treatment.equipment}</p>
                <p className="mt-1"><strong className="text-ink">Cabinas:</strong> {treatment.compatibleCabins.join(', ')}</p>
              </div>
            </article>
          ))}
        </section>
      );
    }

    function ReservationModal({ reservation, selectedDate, reservations, onClose, onSave }) {
      const [form, setForm] = useState(reservation || {
        id: crypto.randomUUID(), date: selectedDate, time: '09:00', client: '', phone: '', treatmentId: 'corte', therapistId: 'laura', cabin: 'Cabina 1', notes: '', status: 'confirmed'
      });
      const [error, setError] = useState('');
      const treatment = treatments.find((item) => item.id === form.treatmentId);

      useEffect(() => {
        const assignment = findAutomaticAssignment(form, reservations);
        if (assignment) {
          setForm((current) => ({ ...current, ...assignment }));
          setError('');
        } else {
          setError('No hay una combinación de cabina y profesional disponible para este horario. Prueba otra hora.');
        }
      }, [form.treatmentId, form.date, form.time]);

      const submit = (event) => {
        event.preventDefault();
        setError('');
        const start = minutesFromTime(form.time);
        const end = start + treatment.duration;
        const conflict = reservations.find((item) => {
          if (item.id === form.id || item.date !== form.date || item.status === 'cancelled') return false;
          const otherTreatment = treatments.find((entry) => entry.id === item.treatmentId);
          const otherStart = minutesFromTime(item.time);
          const otherEnd = otherStart + otherTreatment.duration;
          const overlaps = start < otherEnd && end > otherStart;
          return overlaps && (item.cabin === form.cabin || item.therapistId === form.therapistId);
        });
        if (conflict) {
          const resource = conflict.cabin === form.cabin ? form.cabin : therapists.find((item) => item.id === form.therapistId).name;
          setError(`${resource} ya tiene una reserva que coincide con este horario.`);
          return;
        }
        onSave(form);
      };

      const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

      return (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/55 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
          <div role="dialog" aria-modal="true" aria-labelledby="modal-title" className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-stone-100 bg-white px-5 py-4 sm:px-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-plum">Agenda</p>
                <h2 id="modal-title" className="text-xl font-black">{reservation ? 'Editar reserva' : 'Nueva reserva'}</h2>
              </div>
              <button onClick={onClose} aria-label="Cerrar" className="grid h-10 w-10 place-items-center rounded-full bg-stone-100 text-xl">×</button>
            </div>
            <form onSubmit={submit} className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7">
              <Field label="Cliente" className="sm:col-span-2">
                <input required value={form.client} onChange={(e) => update('client', e.target.value)} placeholder="Nombre y apellidos" className="input" />
              </Field>
              <Field label="Teléfono">
                <input required type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="600 000 000" className="input" />
              </Field>
              <Field label="Tratamiento">
                <select value={form.treatmentId} onChange={(e) => update('treatmentId', e.target.value)} className="input">
                  {treatments.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.duration} min</option>)}
                </select>
              </Field>
              <Field label="Fecha">
                <input required type="date" value={form.date} onChange={(e) => update('date', e.target.value)} className="input" />
              </Field>
              <Field label="Hora">
                <input required type="time" min="08:00" max="20:00" step="900" value={form.time} onChange={(e) => update('time', e.target.value)} className="input" />
              </Field>
              <Field label="Profesional">
                <select value={form.therapistId} onChange={(e) => update('therapistId', e.target.value)} className="input">
                  {therapists.filter((item) => item.treatments.includes(form.treatmentId)).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.specialty}</option>)}
                </select>
                <span className="mt-1 block text-xs font-medium text-emerald-600">✓ Asignación automática disponible</span>
              </Field>
              <Field label="Cabina">
                <select value={form.cabin} onChange={(e) => update('cabin', e.target.value)} className="input">
                  {treatment.compatibleCabins.map((item) => <option key={item}>{item}</option>)}
                </select>
                <span className="mt-1 block text-xs text-stone-400">Solo cabinas con equipamiento compatible</span>
              </Field>
              <Field label="Notas" className="sm:col-span-2">
                <textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} placeholder="Alergias, preferencias o información útil" className="input min-h-24 resize-y"></textarea>
              </Field>
              <div className="sm:col-span-2 rounded-xl bg-stone-50 px-4 py-3 text-sm">
                <strong>Final estimado:</strong> {addMinutes(form.time, treatment.duration)} · <strong>Precio:</strong> {treatment.price} €
              </div>
              <div className="sm:col-span-2 rounded-xl border border-blush bg-rose-50/60 px-4 py-3 text-sm text-stone-600">
                <strong className="text-ink">Política de cancelación:</strong> avísanos con al menos 24 horas de antelación. Si el tratamiento requiere seña, se abonará y gestionará personalmente en el centro.
              </div>
              {error && <div role="alert" className="sm:col-span-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">⚠ {error}</div>}
              <div className="flex justify-end gap-3 sm:col-span-2">
                <button type="button" onClick={onClose} className="rounded-xl border border-stone-200 px-5 py-3 text-sm font-bold">Cancelar</button>
                <button type="submit" className="rounded-xl bg-ink px-5 py-3 text-sm font-bold text-white hover:bg-plum">Guardar reserva</button>
              </div>
            </form>
          </div>
        </div>
      );
    }

    function Field({ label, className = '', children }) {
      return (
        <label className={`block ${className}`}>
          <span className="mb-1.5 block text-sm font-bold">{label}</span>
          {children}
        </label>
      );
    }

    createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
