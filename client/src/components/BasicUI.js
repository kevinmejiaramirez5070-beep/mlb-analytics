import React from 'react';

// Componente Button básico
export const Button = ({ children, onClick, type = 'default', disabled = false, loading = false, ...props }) => {
  const buttonClass = `basic-button ${type} ${disabled ? 'disabled' : ''} ${loading ? 'loading' : ''}`;
  
  return (
    <button 
      className={buttonClass} 
      onClick={onClick} 
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="spinner"></span>}
      {children}
    </button>
  );
};

// Componente Card básico
export const Card = ({ children, title, ...props }) => {
  return (
    <div className="basic-card" {...props}>
      {title && <div className="card-title">{title}</div>}
      <div className="card-content">
        {children}
      </div>
    </div>
  );
};

// Componente Table básico
export const Table = ({ columns, dataSource, loading = false, ...props }) => {
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="basic-table" {...props}>
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th key={index}>{column.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataSource.map((record, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column, colIndex) => (
                <td key={colIndex}>
                  {column.render ? column.render(record[column.dataIndex], record) : record[column.dataIndex]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Componente Input básico
export const Input = ({ placeholder, value, onChange, type = 'text', ...props }) => {
  return (
    <input
      type={type}
      className="basic-input"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      {...props}
    />
  );
};

// Componente Tag básico
export const Tag = ({ children, color = 'default', ...props }) => {
  return (
    <span className={`basic-tag ${color}`} {...props}>
      {children}
    </span>
  );
};

// Componente Alert básico
export const Alert = ({ message, description, type = 'info', ...props }) => {
  return (
    <div className={`basic-alert ${type}`} {...props}>
      <div className="alert-message">{message}</div>
      {description && <div className="alert-description">{description}</div>}
    </div>
  );
};

// Componente DatePicker básico
export const DatePicker = ({ value, onChange, placeholder, ...props }) => {
  return (
    <input
      type="date"
      className="basic-input"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      {...props}
    />
  );
};

// Componente Space básico
export const Space = ({ children, direction = 'horizontal', size = 'middle', ...props }) => {
  return (
    <div className={`basic-space ${direction} ${size}`} {...props}>
      {children}
    </div>
  );
};

// Componente Typography básico
export const Title = ({ children, level = 1, ...props }) => {
  const Tag = `h${level}`;
  return <Tag className="basic-title" {...props}>{children}</Tag>;
};

export const Text = ({ children, type = 'default', strong = false, ...props }) => {
  const className = `basic-text ${type} ${strong ? 'strong' : ''}`;
  return <span className={className} {...props}>{children}</span>;
};

