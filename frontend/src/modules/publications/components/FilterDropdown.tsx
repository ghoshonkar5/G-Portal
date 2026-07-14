import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface FilterDropdownProps {
  selectedValue: string;
  onValueChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}

export function FilterDropdown({ 
  selectedValue, 
  onValueChange, 
  options,
  placeholder = "All Years",
  className = ""
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (value: string) => {
    onValueChange(value);
    setIsOpen(false);
  };

  const displayValue = selectedValue === 'all' ? placeholder : selectedValue;

  return (
    <div 
      ref={containerRef} 
      className={`relative flex ${className}`}
      style={{ overflow: 'visible', zIndex: 10 }}
    >
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative h-10 px-4 rounded-xl transition-all duration-200 flex items-center justify-between gap-2"
        style={{
          backgroundColor: '#E8F5E8',
          border: isOpen ? '2px solid #4CAF50' : '2px solid transparent',
          minWidth: '200px',
          zIndex: 10
        }}
      >
        <span 
          style={{ 
            color: '#2E7D32',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '14px',
            fontWeight: selectedValue !== 'all' ? 500 : 400
          }}
        >
          {displayValue}
        </span>
        <ChevronDown 
          className="w-4 h-4 transition-transform duration-200"
          style={{ 
            color: '#4CAF50',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          ref={dropdownRef}
          className="absolute left-0 bg-white overflow-hidden"
          style={{ 
            top: 'calc(100% + 4px)',
            minWidth: '200px',
            maxHeight: '300px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            zIndex: 9999
          }}
        >
          {/* Custom scrollbar styles */}
          <style>{`
            .filter-dropdown-content::-webkit-scrollbar {
              width: 8px;
            }
            .filter-dropdown-content::-webkit-scrollbar-track {
              background: #F7FAFC;
              border-radius: 4px;
            }
            .filter-dropdown-content::-webkit-scrollbar-thumb {
              background: #CBD5E0;
              border-radius: 4px;
            }
            .filter-dropdown-content::-webkit-scrollbar-thumb:hover {
              background: #A0AEC0;
            }
          `}</style>

          <div 
            className="filter-dropdown-content overflow-y-auto"
            style={{ 
              maxHeight: '300px',
              scrollbarWidth: 'thin',
              scrollbarColor: '#CBD5E0 #F7FAFC'
            }}
          >
            {/* All Years Option */}
            <button
              onClick={() => handleSelect('all')}
              className="w-full text-left transition-colors duration-150"
              style={{
                padding: '10px 14px',
                backgroundColor: selectedValue === 'all' ? '#E6F4EA' : 'white',
                color: '#333',
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: '14px',
                fontWeight: 500,
                borderBottom: '1px solid #f3f4f6'
              }}
              onMouseEnter={(e) => {
                if (selectedValue !== 'all') {
                  e.currentTarget.style.backgroundColor = '#E6F4EA';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedValue !== 'all') {
                  e.currentTarget.style.backgroundColor = 'white';
                }
              }}
            >
              {placeholder}
            </button>

            {/* Year Options */}
            {options.map((option) => (
              <button
                key={option}
                onClick={() => handleSelect(option)}
                className="w-full text-left transition-colors duration-150"
                style={{
                  padding: '10px 14px',
                  backgroundColor: selectedValue === option ? '#E6F4EA' : 'white',
                  color: '#333',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: '14px',
                  fontWeight: 500
                }}
                onMouseEnter={(e) => {
                  if (selectedValue !== option) {
                    e.currentTarget.style.backgroundColor = '#E6F4EA';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedValue !== option) {
                    e.currentTarget.style.backgroundColor = 'white';
                  }
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}