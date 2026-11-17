export default function Field({
  label,
  id,
  error,
  hint,
  required,
  children,
  className = '',
  ...inputProps
}) {
  const inputId = id || inputProps.name;
  return (
    <div className={`form-field ${error ? 'has-error' : ''} ${className}`}>
      {label && (
        <label htmlFor={inputId}>
          {label}
          {required && <span className="req">*</span>}
        </label>
      )}
      {children || <input id={inputId} {...inputProps} aria-invalid={Boolean(error)} />}
      {error ? (
        <p className="field-error">{error}</p>
      ) : (
        hint && <p className="field-hint">{hint}</p>
      )}
    </div>
  );
}

export function Select({ label, id, error, options = [], placeholder, required, ...props }) {
  const selectId = id || props.name;
  return (
    <div className={`form-field ${error ? 'has-error' : ''}`}>
      {label && (
        <label htmlFor={selectId}>
          {label}
          {required && <span className="req">*</span>}
        </label>
      )}
      <select id={selectId} {...props} aria-invalid={Boolean(error)}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export function TextArea({ label, id, error, hint, rows = 3, ...props }) {
  const areaId = id || props.name;
  return (
    <div className={`form-field ${error ? 'has-error' : ''}`}>
      {label && <label htmlFor={areaId}>{label}</label>}
      <textarea id={areaId} rows={rows} {...props} aria-invalid={Boolean(error)} />
      {error ? <p className="field-error">{error}</p> : hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}
