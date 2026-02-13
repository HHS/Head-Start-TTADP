import React, { useState, useMemo } from 'react'
import PropTypes from 'prop-types'
import { Table } from '@trussworks/react-uswds'
import './SimpleSortableTable.css'

const SimpleSortableTable = ({ data, columns, className, elementSortProp }) => {
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'asc',
  })

  const sortedData = useMemo(() => {
    const sortableItems = [...data]
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key]
        let bValue = b[sortConfig.key]
        if (React.isValidElement(aValue)) {
          aValue = aValue.props.children.props[elementSortProp]
        }
        if (React.isValidElement(bValue)) {
          bValue = bValue.props.children.props[elementSortProp]
        }
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1
        }
        return 0
      })
    }
    return sortableItems
  }, [data, sortConfig, elementSortProp])

  const requestSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const renderColumnHeader = (column) => {
    const sortClassName = sortConfig.key === column.key ? sortConfig.direction : ''
    return (
      <th key={column.key} scope="col" className="padding-x-1">
        <button
          type="button"
          onClick={() => requestSort(column.key)}
          className={`sortable ${sortClassName} position-relative bg-white border-0 text-bold`}
          aria-label={`${column.name} Activate to sort ${sortClassName === 'asc' ? 'descending' : 'ascending'}`}
        >
          <span>{column.name}</span>
        </button>
      </th>
    )
  }

  return (
    <div className="ttahub-simple-sortable-table">
      <Table fullWidth striped stackedStyle="default" className={className}>
        <thead>
          <tr>{columns.map((column) => renderColumnHeader(column))}</tr>
        </thead>
        <tbody>
          {sortedData.map((item, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <tr key={index}>
              {columns.map((column) => (
                <td key={column.key} data-label={column.name}>
                  {item[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  )
}

SimpleSortableTable.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    })
  ).isRequired,
  className: PropTypes.string,
  elementSortProp: PropTypes.string,
}

SimpleSortableTable.defaultProps = {
  className: '',
  elementSortProp: 'aria-label',
}

export default SimpleSortableTable
