import {
  Accessibility, CircleParking, DoorOpen, Toilet, ArrowUpDown, MoveHorizontal,
  Armchair, Hand, Ear, GripVertical, Moon, Dog,
} from "lucide-react";

// Icons for the accessibility feature keys in constants/accessibility.js.
// Covers both key sets: personal preferences (FEATURE_OPTIONS — "elevators",
// "automatic_doors", "wide_entrances") and the business fields
// (BUSINESS_ACCESSIBILITY_FEATURES — "elevator", "auto_doors").
export const FEATURE_ICONS = {
  wheelchair_accessible:        Accessibility,
  accessible_parking:           CircleParking,
  wide_entrances:               DoorOpen,
  entrance_width:               DoorOpen,
  accessible_restrooms:         Toilet,
  elevators:                    ArrowUpDown,
  elevator:                     ArrowUpDown,
  automatic_doors:              MoveHorizontal,
  auto_doors:                   MoveHorizontal,
  wheelchair_accessible_tables: Armchair,
  handrails_available:          Hand,
  hearing_assistance:           Ear,
  braille_signage:              GripVertical,
  sensory_friendly:             Moon,
  service_animal_support:       Dog,
};
