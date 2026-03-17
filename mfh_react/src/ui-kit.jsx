import { memo } from "react";

export function Card({ children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl shadow-lg border border-gray-100 p-6 ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({ title, actions }) {
  return (
    <div className="flex items-center justify-between mb-8">
      <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{title}</h1>
      <div>{actions}</div>
    </div>
  );
}

export function SectionTitle({ children }) {
  return <h2 className="text-xl font-semibold text-gray-700 mb-4 mt-6">{children}</h2>;
}

export const DataTable = memo(function DataTable({ columns, data }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-100">{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50" + " hover:bg-blue-50 transition"}>
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-2 border-b border-gray-50 text-gray-800">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
