import * as XLSX from "xlsx"
import { saveAs } from "file-saver"

type ExportData = Record<string, string | number | boolean | null | undefined>

/**
 * Export data to CSV file
 */
export function exportToCSV(data: ExportData[], filename: string): void {
  if (data.length === 0) {
    console.warn("No data to export")
    return
  }

  // Get headers from first row
  const headers = Object.keys(data[0])

  // Convert data to CSV rows
  const csvRows = [
    headers.join(","), // Header row
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header]
          // Escape values with commas, quotes, or newlines
          if (value === null || value === undefined) return ""
          const stringValue = String(value)
          if (
            stringValue.includes(",") ||
            stringValue.includes('"') ||
            stringValue.includes("\n")
          ) {
            return `"${stringValue.replace(/"/g, '""')}"`
          }
          return stringValue
        })
        .join(",")
    ),
  ]

  // Create blob and trigger download
  const csvContent = csvRows.join("\n")
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" })
  saveAs(blob, `${filename}.csv`)
}

/**
 * Export data to Excel (XLSX) file
 */
export function exportToExcel(data: ExportData[], filename: string): void {
  if (data.length === 0) {
    console.warn("No data to export")
    return
  }

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(data)

  // Auto-size columns based on content
  const headers = Object.keys(data[0])
  const colWidths = headers.map((header) => {
    // Get max width between header and all cell values
    const maxContentWidth = Math.max(
      header.length,
      ...data.map((row) => String(row[header] ?? "").length)
    )
    return { wch: Math.min(maxContentWidth + 2, 50) } // Add padding, cap at 50
  })
  worksheet["!cols"] = colWidths

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data")

  // Generate buffer and save
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  saveAs(blob, `${filename}.xlsx`)
}

/**
 * Export data to JSON file
 */
export function exportToJSON(data: ExportData[], filename: string): void {
  const jsonContent = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonContent], { type: "application/json" })
  saveAs(blob, `${filename}.json`)
}
