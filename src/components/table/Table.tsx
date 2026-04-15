'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { CellValue } from './CellValue'
import './Table.css'

export interface TableColumn {
  key: string
  label: string
  width?: string
  align?: 'left' | 'center' | 'right'
  format?: (value: unknown, row: Record<string, unknown>) => ReactNode
}

export interface TableProps {
  columns: TableColumn[]
  rows: Record<string, unknown>[]
  rowKey?: (row: Record<string, unknown>, index: number) => string | number
  rowClassName?: (row: Record<string, unknown>, index: number) => string
  className?: string
  striped?: boolean
  hoverable?: boolean
  sortable?: boolean
  loading?: boolean
  skeletonRows?: number
  pageSize?: number
  /** Column key to highlight as active/highlighted */
  activeColumn?: string
  hasMore?: boolean
  /** Show card-style header with label, row count, and spinner */
  cardHeader?: {
    label: string
    showRowCount?: boolean
    showSpinner?: boolean
  }
}

export function Table({
  columns,
  rows,
  rowKey,
  rowClassName,
  className = '',
  striped = true,
  hoverable = true,
  sortable = false,
  loading = false,
  skeletonRows = 5,
  pageSize,
  activeColumn,
  hasMore = false,
  cardHeader
}: TableProps) {
  const [page, setPage] = useState(0)

  useEffect(() => {
    setPage(0)
  }, [rows])

  const pagedRows = pageSize ? rows.slice(page * pageSize, (page + 1) * pageSize) : rows
  const totalPages = pageSize ? Math.ceil(rows.length / pageSize) : 1
  const rowsToDisplay = loading ? Array(skeletonRows).fill(null) : pagedRows

  const canGoPrev = page > 0
  const canGoNext = pageSize ? page < totalPages - 1 : false

  const handlePrevPage = () => {
    if (canGoPrev) setPage(page - 1)
  }

  const handleNextPage = () => {
    if (canGoNext) setPage(page + 1)
  }

  const pageStart = pageSize ? page * pageSize + 1 : 1
  const pageEnd = pageSize ? Math.min((page + 1) * pageSize, rows.length) : rows.length
  const rowCountLabel = hasMore ? `${rows.length} rows from many` : `${rows.length} rows`

  return (
    <div className={`table-wrapper ${className}`}>
      {cardHeader && (
        <div className="table-card-header">
          <span className="table-card-label">{cardHeader.label}</span>
          {(cardHeader.showSpinner !== false && loading) && <div className="table-spinner" />}
          {cardHeader.showRowCount !== false && !loading && rows.length > 0 && (
            <span className="table-card-count">
              {rows.length} {hasMore ? 'rows from many' : 'rows'}
            </span>
          )}
        </div>
      )}
      {(rows.length > 0 || hasMore) && !cardHeader && (
        <div className="table-header">
          <span className="table-row-count">{rowCountLabel}</span>
          {loading && <div className="table-spinner" />}
        </div>
      )}

      <div className="table-scroll">
        <table className={`table ${striped ? 'table-striped' : ''} ${hoverable ? 'table-hover' : ''}`}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  style={{
                    width: column.width,
                    textAlign: column.align || 'left'
                  }}
                  className={`${sortable ? 'sortable' : ''} ${
                    String(activeColumn) === String(column.key) ? 'table-col--active' : ''
                  }`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && rowsToDisplay.length > 0 ? (
              rowsToDisplay.map((_, index) => (
                <tr key={`skeleton-${index}`} className="table-row--skeleton">
                  {columns.map((column) => (
                    <td key={String(column.key)}>
                      <div className="table-skeleton" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rowsToDisplay.length === 0 ? (
              <tr className="empty-row">
                <td colSpan={columns.length} className="empty-message">
                  No data available
                </td>
              </tr>
            ) : (
              rowsToDisplay.map((row, index) => (
                <tr
                  key={rowKey ? rowKey(row, index) : index}
                  className={rowClassName ? rowClassName(row, index) : ''}
                >
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      style={{ textAlign: column.align || 'left' }}
                      className={String(activeColumn) === String(column.key) ? 'table-col--active' : ''}
                    >
                      {column.format
                        ? column.format(row[column.key], row)
                        : <CellValue value={row[column.key] == null ? null : String(row[column.key])} />}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pageSize && (
        <div className="table-pagination">
          <button
            className="table-page-btn"
            onClick={handlePrevPage}
            disabled={!canGoPrev}
          >
            Prev
          </button>
          <span className="table-page-info">
            {pageStart}–{pageEnd} of {rows.length}
          </span>
          <button
            className="table-page-btn"
            onClick={handleNextPage}
            disabled={!canGoNext}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
