import React from 'react';
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  DoorOpen,
  Plus,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { CollegeEvent } from '../types';
import {
  getEvents,
  getActiveEventId,
  setActiveEventId,
  getRegistrations,
} from '../services/storage';

interface EventsViewProps {
  onOpenCreateEvent: () => void;
  onSelectEvent: (event: CollegeEvent) => void;
}

export const EventsView: React.FC<EventsViewProps> = ({
  onOpenCreateEvent,
  onSelectEvent,
}) => {
  const events = getEvents();
  const activeEventId = getActiveEventId();
  const allRegistrations = getRegistrations();

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white border-2 border-slate-200/80 rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-600 mb-1">
            <span>College Gate Registry</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Campus Events &amp; Gate Verification
          </h1>
          <p className="text-xs text-slate-600 mt-1 max-w-xl leading-relaxed">
            Manage college hackathons, fests, workshops, and symposiums. Select an event to activate gate scanning and live attendance tracking.
          </p>
        </div>
        <button
          onClick={onOpenCreateEvent}
          className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-xs font-bold text-white flex items-center gap-2 shadow-md shadow-orange-500/20 transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Event</span>
        </button>
      </div>

      {/* Events Grid or Empty State */}
      {events.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-300 rounded-3xl p-12 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 text-orange-600 flex items-center justify-center mx-auto border border-amber-200">
            <Calendar className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">No Events Created Yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
              You haven&apos;t added any events yet. Click &apos;Insert Event Details&apos; to enter your event name, venue, gate, and date.
            </p>
          </div>
          <button
            onClick={onOpenCreateEvent}
            className="py-3 px-6 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-xs font-bold text-white shadow-md shadow-orange-500/25 inline-flex items-center gap-2 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Insert Event Details</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {events.map((event) => {
            const isActive = event.id === activeEventId;
            const regCount = allRegistrations.filter((r) => r.eventId === event.id).length;
            const capacityPercent = Math.min(100, Math.round((regCount / (event.capacity || 100)) * 100));

            return (
              <div
                key={event.id}
                className={`rounded-3xl border-2 transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                  isActive
                    ? 'bg-white border-orange-500 shadow-lg shadow-orange-500/10 ring-2 ring-orange-400'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Card Header & Category Tag */}
                <div className="p-5 sm:p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-orange-600">
                      <span>{event.category}</span>
                      <span>·</span>
                      <span className="text-slate-500 font-mono text-[11px]">{event.date}</span>
                    </div>

                    {isActive ? (
                      <span className="px-2.5 py-1 rounded-full bg-orange-100 border border-orange-300 text-[11px] font-bold text-orange-800 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                        <span>Active Gate</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-500 uppercase">
                        {event.status}
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">{event.title}</h3>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                      {event.description}
                    </p>
                  </div>

                  {/* Logistics */}
                  <div className="pt-2 grid grid-cols-2 gap-2 text-xs text-slate-700">
                    <div className="flex items-center gap-1.5 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span className="line-clamp-1">{event.venue}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-[11px] font-medium">
                      <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>{event.time.split('–')[0]}</span>
                    </div>
                    <div className="flex items-center gap-1.5 col-span-2 text-blue-700 font-mono font-bold text-[11px] bg-blue-50 px-2 py-1 rounded-lg border border-blue-200">
                      <DoorOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Entry: {event.entryGate}</span>
                    </div>
                  </div>

                  {/* Capacity & Registrations bar */}
                  <div className="pt-2">
                    <div className="flex justify-between text-xs text-slate-600 font-medium mb-1">
                      <span>Registered Attendees</span>
                      <span className="font-mono text-slate-900 font-bold">
                        {regCount} / {event.capacity} ({capacityPercent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className="bg-gradient-to-r from-orange-500 to-amber-400 h-full rounded-full transition-all"
                        style={{ width: `${capacityPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
                  {isActive ? (
                    <span className="text-xs text-emerald-700 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Armed for scanning &amp; attendance</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        setActiveEventId(event.id);
                        onSelectEvent(event);
                      }}
                      className="py-2 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700 transition-colors"
                    >
                      Set as Active Gate
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setActiveEventId(event.id);
                      onSelectEvent(event);
                    }}
                    className="py-2 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white flex items-center gap-1.5 ml-auto transition-colors shadow-xs"
                  >
                    <span>Open Gate Scanner</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
