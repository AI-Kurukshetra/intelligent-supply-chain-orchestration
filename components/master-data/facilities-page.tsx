import { Factory, MapPinned, PackageSearch, Warehouse } from "lucide-react";

export type Facility = {
  id: string;
  code: string;
  name: string;
  type: "plant" | "warehouse" | "distribution_center" | "cross_dock";
  address?: { city?: string; state?: string } | null;
  country_code?: string | null;
  timezone: string;
  status: string;
};

const iconMap = {
  plant: Factory,
  warehouse: Warehouse,
  distribution_center: PackageSearch,
  cross_dock: MapPinned
} as const;

export function FacilitiesPage({ facilities }: { facilities: Facility[] }) {
  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-600">Master Data</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Facilities</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">View operational sites with their facility type, location footprint, timezone, and network status.</p>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {facilities.map((facility) => {
          const Icon = iconMap[facility.type];
          const location = [facility.address?.city, facility.address?.state, facility.country_code].filter(Boolean).join(", ");

          return (
            <article key={facility.id} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="inline-flex rounded-2xl bg-sky-50 p-3 text-sky-700">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-700">{facility.status}</span>
              </div>
              <h2 className="mt-5 text-xl font-semibold text-slate-950">{facility.name}</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">{facility.code}</p>
              <div className="mt-5 grid gap-3 text-sm text-slate-600">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Facility Type</p>
                  <p className="mt-1 font-medium text-slate-900">{facility.type.replace(/_/g, " ")}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Location</p>
                  <p className="mt-1 font-medium text-slate-900">{location || "Address pending"}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Timezone</p>
                  <p className="mt-1 font-medium text-slate-900">{facility.timezone}</p>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
