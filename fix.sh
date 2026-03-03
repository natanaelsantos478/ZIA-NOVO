sed -i 's/import React, { createContext, useContext, useState, ReactNode } from '"'"'react'"'"';/import { createContext, useContext, useState } from '"'"'react'"'"';\nimport type { ReactNode } from '"'"'react'"'"';/' src/context/HRContext.tsx

sed -i 's/import React, { useState, useEffect } from '"'"'react'"'"';/import { useState, useEffect } from '"'"'react'"'"';/' src/features/hr/sections/EditShiftTab.tsx
sed -i 's/import { Shift, Employee } from '"'"'..\/..\/..\/context\/HRContext'"'"';/import type { Shift, Employee } from '"'"'..\/..\/..\/context\/HRContext'"'"';/' src/features/hr/sections/EditShiftTab.tsx

sed -i 's/import { useHRContext, Employee, EmployeeStatus, ContractType, WorkMode, Shift } from '"'"'..\/..\/..\/context\/HRContext'"'"';/import { useHRContext } from '"'"'..\/..\/..\/context\/HRContext'"'"';\nimport type { Employee, EmployeeStatus, ContractType, WorkMode, Shift } from '"'"'..\/..\/..\/context\/HRContext'"'"';/' src/features/hr/sections/Employees.tsx

sed -i 's/import { useHRContext, Shift, ShiftType, Employee } from '"'"'..\/..\/..\/context\/HRContext'"'"';/import { useHRContext } from '"'"'..\/..\/..\/context\/HRContext'"'"';\nimport type { Shift, ShiftType, Employee } from '"'"'..\/..\/..\/context\/HRContext'"'"';/' src/features/hr/sections/Schedules.tsx

sed -i 's/import { Trash2, Edit2, X } from '"'"'lucide-react'"'"';/import { Trash2, Edit2 } from '"'"'lucide-react'"'"';/' src/features/hr/sections/Schedules.tsx
