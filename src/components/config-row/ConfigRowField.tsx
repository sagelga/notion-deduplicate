// ConfigRowField.tsx
// Field (property) selector portion of the sentence-style ConfigRow.

import { type NotionProperty } from "@/lib/notion";
import { ConfigRowDropdown, type ConfigRowDropdownOption } from "./ConfigRowDropdown";
import { ConfigRowLabel } from "./ConfigRowLabel";

const NOTION_TYPE_MAP: Record<string, { label: string; icon: string }> = {
  title:            { label: "Title",            icon: "Aa" },
  rich_text:        { label: "Text",             icon: "T"  },
  number:           { label: "Number",           icon: "#"  },
  select:           { label: "Select",           icon: "⊙"  },
  multi_select:     { label: "Multi-select",     icon: "⊕"  },
  status:           { label: "Status",           icon: "◎"  },
  date:             { label: "Date",             icon: "📅" },
  people:           { label: "Person",           icon: "👤" },
  files:            { label: "Files & media",    icon: "📎" },
  checkbox:         { label: "Checkbox",         icon: "☑"  },
  url:              { label: "URL",              icon: "🔗" },
  email:            { label: "Email",            icon: "@"  },
  phone_number:     { label: "Phone",            icon: "📞" },
  formula:          { label: "Formula",          icon: "Σ"  },
  relation:         { label: "Relation",         icon: "↗"  },
  rollup:           { label: "Rollup",           icon: "⟲"  },
  created_time:     { label: "Created time",     icon: "🕐" },
  created_by:       { label: "Created by",       icon: "👤" },
  last_edited_time: { label: "Last edited time", icon: "🕐" },
  last_edited_by:   { label: "Last edited by",   icon: "👤" },
  button:           { label: "Button",           icon: "⊞"  },
  unique_id:        { label: "ID",               icon: "#"  },
};

interface ConfigRowFieldProps {
  properties: NotionProperty[];
  selectedProperty: string;
  onPropertySelect: (name: string) => void;
  isRunning: boolean;
}

export function ConfigRowField({
  properties,
  selectedProperty,
  onPropertySelect,
  isRunning,
}: ConfigRowFieldProps) {
  const propertyOptions: ConfigRowDropdownOption[] = properties.map((prop) => {
    const mapped = NOTION_TYPE_MAP[prop.type];
    return {
      value: prop.name,
      label: prop.name,
      description: mapped ? `${mapped.icon} ${mapped.label}` : prop.type,
    };
  });

  return (
    <>
      <ConfigRowLabel text="using" />
      <ConfigRowDropdown
        value={selectedProperty}
        onChange={onPropertySelect}
        options={propertyOptions}
        disabled={isRunning}
        inline
      />
    </>
  );
}