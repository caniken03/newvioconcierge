import { useState, useCallback, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import Papa from "papaparse";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Upload, 
  FileText,
  CheckCircle,
  AlertCircle,
  Users,
  Play,
  Download,
  ArrowLeft,
  ArrowRight,
  X,
  Eye,
  Settings,
  MapPin,
  Loader2,
  Target,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Info,
  Calendar,
  Phone,
  Tag
} from "lucide-react";
import type { Contact, ContactGroup } from "@/types";

// CSV Upload Wizard Step Types
interface CSVUploadWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CSVFile {
  file: File;
  headers: string[];
  rows: any[][];
  rowCount: number;
  fileSize: number;
  encoding: string;
  delimiter: string;
}

interface FieldMapping {
  csvColumn: string;
  contactField: ContactFieldType | '';
  confidence: number;
  required: boolean;
  dataType: 'text' | 'phone' | 'email' | 'date' | 'time' | 'number';
  sampleValues: string[];
  suggestions?: ContactFieldType[];
}

interface ValidationError {
  row: number;
  column: string;
  value: any;
  error: string;
  severity: 'error' | 'warning' | 'info';
  suggestion?: string;
  hipaaViolation?: boolean;
  phiType?: 'direct' | 'quasi' | 'potential';
}

interface GroupAssignment {
  columnName: string;
  groupMappings: Record<string, string>; // CSV value -> Group ID
  autoCreateGroups: boolean;
  newGroups: string[];
}

interface GroupValue {
  originalValue: string;
  normalizedValue: string;
  count: number;
  action: 'create' | 'assign' | 'skip';
  targetGroupId: string | null;
  rows: number[];
}

interface ImportPreview {
  contactsToCreate: any[];
  groupsToCreate: string[];
  appointmentsToSchedule: any[];
  validationSummary: {
    total: number;
    valid: number;
    errors: number;
    warnings: number;
  };
}

const WIZARD_STEPS = [
  { id: 1, title: "Upload CSV File", description: "Select and upload your CSV file" },
  { id: 2, title: "Map Fields", description: "Map CSV columns to contact fields" },
  { id: 3, title: "Validate Data", description: "Review and fix data validation issues" },
  { id: 4, title: "Configure Groups", description: "Set up group assignments" },
  { id: 5, title: "Preview Import", description: "Review contacts before importing" },
  { id: 6, title: "Import Progress", description: "Track the import process" }
];

// Standard contact field types - ALL contact fields from schema
type ContactFieldType = 
  // Core fields
  | 'name' 
  | 'phone' 
  | 'email' 
  // Appointment fields
  | 'appointmentDate' 
  | 'appointmentTime' 
  | 'appointmentType' 
  | 'duration' 
  | 'appointmentStatus'
  | 'timezone'
  | 'callBeforeHours'
  // Business/Company fields
  | 'companyName'
  | 'ownerName'
  | 'bookingSource'
  | 'locationId'
  // Priority and contact preferences
  | 'priorityLevel'
  | 'preferredContactMethod'
  // Instructions and notes
  | 'specialInstructions' 
  | 'notes'
  // Legacy/business-specific fields (kept for compatibility)
  | 'provider' 
  | 'serviceType'
  | 'partySize'
  | 'occasion'
  | 'consultationType'
  // Groups
  | 'groups';

type BusinessType = 'medical' | 'salon' | 'restaurant' | 'consultant' | 'general';

interface BusinessConfig {
  requiredFields: ContactFieldType[];
  optionalFields: ContactFieldType[];
  restrictedFields?: ContactFieldType[];
  fieldLabels: Record<ContactFieldType, string>;
}

// Business type specific field mappings
const BUSINESS_FIELD_MAPPINGS: Record<BusinessType, BusinessConfig> = {
  medical: {
    requiredFields: ['name', 'phone', 'appointmentDate', 'appointmentTime'],
    optionalFields: ['email', 'appointmentType', 'provider', 'specialInstructions', 'timezone', 'companyName', 'ownerName', 'priorityLevel', 'preferredContactMethod', 'callBeforeHours', 'groups'],
    restrictedFields: ['notes'], // HIPAA compliance
    fieldLabels: {
      name: 'Patient Name',
      phone: 'Phone Number',
      email: 'Email Address',
      appointmentDate: 'Appointment Date',
      appointmentTime: 'Appointment Time',
      appointmentType: 'Visit Type',
      appointmentStatus: 'Appointment Status',
      provider: 'Doctor/Provider',
      specialInstructions: 'Preparation Instructions',
      duration: 'Duration (minutes)',
      timezone: 'Timezone',
      callBeforeHours: 'Call Before (hours)',
      companyName: 'Clinic/Hospital',
      ownerName: 'Account Owner',
      bookingSource: 'Booking Source',
      locationId: 'Location ID',
      priorityLevel: 'Priority',
      preferredContactMethod: 'Contact Method',
      groups: 'Groups',
      notes: 'Notes',
      serviceType: 'Service Type',
      partySize: 'Party Size',
      occasion: 'Occasion',
      consultationType: 'Consultation Type'
    }
  },
  salon: {
    requiredFields: ['name', 'phone', 'appointmentDate', 'appointmentTime'],
    optionalFields: ['email', 'serviceType', 'provider', 'duration', 'specialInstructions', 'timezone', 'companyName', 'ownerName', 'priorityLevel', 'preferredContactMethod', 'callBeforeHours', 'groups'],
    fieldLabels: {
      name: 'Client Name',
      phone: 'Phone Number',
      email: 'Email Address',
      appointmentDate: 'Appointment Date',
      appointmentTime: 'Appointment Time',
      serviceType: 'Service Type',
      appointmentType: 'Service Type',
      appointmentStatus: 'Appointment Status',
      provider: 'Stylist',
      specialInstructions: 'Special Requests',
      duration: 'Duration (minutes)',
      timezone: 'Timezone',
      callBeforeHours: 'Call Before (hours)',
      companyName: 'Salon/Business Name',
      ownerName: 'Account Owner',
      bookingSource: 'Booking Source',
      locationId: 'Location ID',
      priorityLevel: 'Priority',
      preferredContactMethod: 'Contact Method',
      groups: 'Groups',
      notes: 'Notes',
      partySize: 'Party Size',
      occasion: 'Occasion',
      consultationType: 'Consultation Type'
    }
  },
  restaurant: {
    requiredFields: ['name', 'phone', 'appointmentDate', 'appointmentTime'],
    optionalFields: ['email', 'partySize', 'occasion', 'specialInstructions', 'timezone', 'companyName', 'ownerName', 'priorityLevel', 'preferredContactMethod', 'callBeforeHours', 'groups'],
    fieldLabels: {
      name: 'Guest Name',
      phone: 'Phone Number',
      email: 'Email Address',
      appointmentDate: 'Reservation Date',
      appointmentTime: 'Reservation Time',
      partySize: 'Party Size',
      occasion: 'Occasion',
      specialInstructions: 'Special Requests',
      appointmentType: 'Reservation Type',
      appointmentStatus: 'Appointment Status',
      provider: 'Host/Server',
      duration: 'Duration (minutes)',
      timezone: 'Timezone',
      callBeforeHours: 'Call Before (hours)',
      companyName: 'Restaurant Name',
      ownerName: 'Account Owner',
      bookingSource: 'Booking Source',
      locationId: 'Location ID',
      priorityLevel: 'Priority',
      preferredContactMethod: 'Contact Method',
      groups: 'Groups',
      notes: 'Notes',
      serviceType: 'Service Type',
      consultationType: 'Consultation Type'
    }
  },
  consultant: {
    requiredFields: ['name', 'phone', 'appointmentDate', 'appointmentTime'],
    optionalFields: ['email', 'consultationType', 'provider', 'duration', 'specialInstructions', 'timezone', 'companyName', 'ownerName', 'priorityLevel', 'preferredContactMethod', 'callBeforeHours', 'groups'],
    fieldLabels: {
      name: 'Client Name',
      phone: 'Phone Number',
      email: 'Email Address',
      appointmentDate: 'Appointment Date',
      appointmentTime: 'Appointment Time',
      consultationType: 'Consultation Type',
      appointmentType: 'Consultation Type',
      appointmentStatus: 'Appointment Status',
      provider: 'Consultant',
      specialInstructions: 'Preparation Required',
      duration: 'Duration (minutes)',
      timezone: 'Timezone',
      callBeforeHours: 'Call Before (hours)',
      companyName: 'Company Name',
      ownerName: 'Account Owner',
      bookingSource: 'Booking Source',
      locationId: 'Location ID',
      priorityLevel: 'Priority',
      preferredContactMethod: 'Contact Method',
      groups: 'Groups',
      notes: 'Notes',
      serviceType: 'Service Type',
      partySize: 'Party Size',
      occasion: 'Occasion'
    }
  },
  general: {
    requiredFields: ['name', 'phone', 'appointmentDate', 'appointmentTime'],
    optionalFields: ['email', 'appointmentType', 'duration', 'specialInstructions', 'timezone', 'companyName', 'ownerName', 'priorityLevel', 'preferredContactMethod', 'callBeforeHours', 'bookingSource', 'locationId', 'groups', 'notes'],
    fieldLabels: {
      name: 'Contact Name',
      phone: 'Phone Number',
      email: 'Email Address',
      appointmentDate: 'Appointment Date',
      appointmentTime: 'Appointment Time',
      appointmentType: 'Appointment Type',
      appointmentStatus: 'Appointment Status',
      duration: 'Duration (minutes)',
      timezone: 'Timezone',
      callBeforeHours: 'Call Before (hours)',
      companyName: 'Company/Business',
      ownerName: 'Owner Name',
      bookingSource: 'Booking Source',
      locationId: 'Location ID',
      priorityLevel: 'Priority',
      preferredContactMethod: 'Contact Method',
      specialInstructions: 'Special Instructions',
      provider: 'Provider',
      groups: 'Groups',
      notes: 'Notes',
      serviceType: 'Service Type',
      partySize: 'Party Size',
      occasion: 'Occasion',
      consultationType: 'Consultation Type'
    }
  }
};

export function CSVUploadWizard({ isOpen, onClose }: CSVUploadWizardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [csvFile, setCsvFile] = useState<CSVFile | null>(null);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [groupAssignments, setGroupAssignments] = useState<GroupValue[]>([]);
  const [selectedGroupColumn, setSelectedGroupColumn] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Business type - should be sourced from tenant config, defaulting to general for testing
  // TODO: Wire to actual tenant configuration
  const [businessType, setBusinessType] = useState<BusinessType>('general');
  const businessConfig = BUSINESS_FIELD_MAPPINGS[businessType];

  // Allow business type override for testing HIPAA compliance
  const setBusinessTypeForTesting = (type: BusinessType) => {
    setBusinessType(type);
    // Clear validation errors when business type changes to re-run validation
    setValidationErrors([]);
  };

  // Step 1: File Upload Implementation with Papa Parse
  const handleFileUpload = useCallback(async (file: File) => {
    if (!file) return;

    setIsProcessing(true);
    try {
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
        throw new Error('Please select a valid CSV file');
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit per PRD
        throw new Error('File size must be less than 10MB');
      }

      // Parse CSV with Papa Parse for robust handling
      const parseResult = await new Promise<Papa.ParseResult<string[]>>((resolve, reject) => {
        Papa.parse(file, {
          header: false,
          skipEmptyLines: true,
          encoding: 'UTF-8',
          transformHeader: (header) => header.trim(),
          transform: (value) => value.trim(),
          complete: (results) => resolve(results),
          error: (error) => reject(error)
        });
      });

      if (parseResult.errors.length > 0) {
        const errorMessages = parseResult.errors.map(e => e.message).join(', ');
        throw new Error(`CSV parsing errors: ${errorMessages}`);
      }

      const allRows = parseResult.data;
      if (allRows.length === 0) {
        throw new Error('CSV file appears to be empty');
      }

      if (allRows.length > 10000) { // Row limit per PRD
        throw new Error('CSV file exceeds maximum 10,000 rows');
      }

      // Extract headers and data rows
      const headers = allRows[0];
      const dataRows = allRows.slice(1);

      if (headers.length === 0) {
        throw new Error('CSV file must have header columns');
      }

      const csvData: CSVFile = {
        file,
        headers,
        rows: dataRows,
        rowCount: dataRows.length,
        fileSize: file.size,
        encoding: 'UTF-8',
        delimiter: parseResult.meta.delimiter || ','
      };

      setCsvFile(csvData);
      
      // Auto-generate intelligent field mappings with sample data
      const mappings = generateFieldMappings(headers, dataRows, businessConfig);
      setFieldMappings(mappings);
      
      // Clear any previous validation errors when uploading new file
      setValidationErrors([]);
      
      toast({
        title: "CSV file uploaded successfully",
        description: `Processed ${csvData.rowCount} rows with ${headers.length} columns`,
      });

      // Move to next step
      setCurrentStep(2);
      
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to process CSV file",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [businessConfig, toast]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  // Enhanced intelligent field mapping with confidence scoring
  const generateFieldMappings = (headers: string[], dataRows: string[][], config: BusinessConfig): FieldMapping[] => {
    return headers.map((header, columnIndex) => {
      const lowerHeader = header.toLowerCase().trim();
      let bestMatch: ContactFieldType | '' = '';
      let confidence = 0;
      let dataType: 'text' | 'phone' | 'email' | 'date' | 'time' | 'number' = 'text';
      const suggestions: ContactFieldType[] = [];

      // Get sample values from first 5 non-empty rows
      const sampleValues = dataRows
        .slice(0, 5)
        .map(row => row[columnIndex] || '')
        .filter(val => val.trim())
        .slice(0, 3);

      // Define header synonyms for each field type
      const fieldSynonyms: Record<ContactFieldType, string[]> = {
        // Core fields
        name: ['name', 'customer', 'client', 'patient', 'guest', 'contact', 'full name', 'firstname', 'lastname'],
        phone: ['phone', 'mobile', 'telephone', 'tel', 'cell', 'number', 'contact number'],
        email: ['email', 'e-mail', 'mail', 'email address'],
        // Appointment fields
        appointmentDate: ['date', 'appointment date', 'appt date', 'visit date', 'reservation date'],
        appointmentTime: ['time', 'appointment time', 'appt time', 'visit time', 'reservation time'],
        appointmentType: ['type', 'service type', 'appointment type', 'visit type', 'service', 'procedure'],
        appointmentStatus: ['status', 'appointment status', 'appt status', 'booking status'],
        duration: ['duration', 'length', 'time duration', 'minutes', 'hours'],
        timezone: ['timezone', 'time zone', 'tz'],
        callBeforeHours: ['call before', 'hours before', 'reminder hours', 'advance notice'],
        // Business/Company fields
        companyName: ['company', 'business', 'company name', 'business name', 'organization'],
        ownerName: ['owner', 'owner name', 'account owner', 'responsible party'],
        bookingSource: ['source', 'booking source', 'referral', 'channel'],
        locationId: ['location', 'location id', 'branch', 'office'],
        // Priority and contact preferences
        priorityLevel: ['priority', 'priority level', 'urgency', 'importance'],
        preferredContactMethod: ['contact method', 'preferred method', 'contact preference', 'communication preference'],
        // Instructions and notes
        specialInstructions: ['instructions', 'special instructions', 'comments', 'remarks', 'preparation'],
        notes: ['notes', 'internal notes', 'remarks', 'memo'],
        // Legacy/business-specific fields
        provider: ['provider', 'doctor', 'stylist', 'consultant', 'therapist', 'professional'],
        serviceType: ['service', 'service type', 'treatment', 'procedure'],
        partySize: ['party', 'party size', 'guests', 'people', 'size'],
        occasion: ['occasion', 'event', 'celebration', 'reason'],
        consultationType: ['consultation', 'consultation type', 'meeting type'],
        // Groups
        groups: ['group', 'groups', 'category', 'categories', 'classification', 'department']
      };

      // Score each field type based on header similarity
      const allFieldTypes = Object.keys(fieldSynonyms) as ContactFieldType[];
      const fieldScores: Array<{field: ContactFieldType, score: number}> = [];

      for (const fieldType of allFieldTypes) {
        const synonyms = fieldSynonyms[fieldType];
        let maxScore = 0;

        for (const synonym of synonyms) {
          let score = 0;
          
          // Exact match
          if (lowerHeader === synonym) {
            score = 100;
          }
          // Header contains synonym
          else if (lowerHeader.includes(synonym)) {
            score = 85;
          }
          // Synonym contains header (partial match)
          else if (synonym.includes(lowerHeader) && lowerHeader.length > 2) {
            score = 70;
          }
          // Fuzzy matching for common abbreviations
          else if (synonym.includes('appointment') && lowerHeader.includes('appt')) {
            score = 80;
          }
          
          maxScore = Math.max(maxScore, score);
        }

        if (maxScore > 0) {
          fieldScores.push({ field: fieldType, score: maxScore });
        }
      }

      // Sort by score and select best match
      fieldScores.sort((a, b) => b.score - a.score);
      
      if (fieldScores.length > 0) {
        bestMatch = fieldScores[0].field;
        confidence = fieldScores[0].score;
        
        // Add alternative suggestions
        suggestions.push(...fieldScores.slice(1, 4).map(s => s.field));
      }

      // Enhance confidence with data type validation
      if (sampleValues.length > 0 && bestMatch) {
        const dataValidation = validateDataType(sampleValues, bestMatch);
        if (dataValidation.isValid) {
          confidence = Math.min(confidence + 10, 100);
          dataType = dataValidation.detectedType;
        } else {
          confidence = Math.max(confidence - 20, 0);
        }
      }

      return {
        csvColumn: header,
        contactField: bestMatch,
        confidence,
        required: config.requiredFields.includes(bestMatch),
        dataType,
        sampleValues,
        suggestions
      };
    });
  };

  // Helper function to validate data type based on sample values
  const validateDataType = (sampleValues: string[], fieldType: ContactFieldType): {
    isValid: boolean;
    detectedType: 'text' | 'phone' | 'email' | 'date' | 'time' | 'number';
  } => {
    let detectedType: 'text' | 'phone' | 'email' | 'date' | 'time' | 'number' = 'text';
    let isValid = true;

    if (fieldType === 'phone') {
      detectedType = 'phone';
      // Check if samples look like phone numbers
      const phonePattern = /[\d\s\-\(\)\+\.]{7,}/;
      isValid = sampleValues.every(val => phonePattern.test(val));
    } else if (fieldType === 'email') {
      detectedType = 'email';
      // Check if samples look like emails
      const emailPattern = /[^\s@]+@[^\s@]+\.[^\s@]+/;
      isValid = sampleValues.every(val => emailPattern.test(val));
    } else if (fieldType === 'appointmentDate') {
      detectedType = 'date';
      // Check if samples look like dates
      isValid = sampleValues.every(val => !isNaN(Date.parse(val)));
    } else if (fieldType === 'appointmentTime') {
      detectedType = 'time';
      // Check if samples look like times
      const timePattern = /\d{1,2}:\d{2}|am|pm/i;
      isValid = sampleValues.every(val => timePattern.test(val) || !isNaN(Date.parse(`1/1/2000 ${val}`)));
    } else if (fieldType === 'duration') {
      detectedType = 'number';
      // Check if samples are numeric
      isValid = sampleValues.every(val => !isNaN(Number(val)));
    }

    return { isValid, detectedType };
  };

  // Navigation functions
  const goToNextStep = () => {
    if (currentStep < WIZARD_STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setCsvFile(null);
    setFieldMappings([]);
    setValidationErrors([]);
    setGroupAssignments([]);
    setImportPreview(null);
    setImportProgress(0);
    setIsProcessing(false);
    onClose();
  };

  // Download CSV template based on business type
  const handleDownloadTemplate = () => {
    const headers = businessConfig.requiredFields.concat(businessConfig.optionalFields);
    
    // Create CSV content with headers
    const csvContent = headers.join(',') + '\n';
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${businessType}_contacts_template.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
    toast({
      title: "Template Downloaded",
      description: `CSV template for ${businessType} contacts has been downloaded`,
    });
  };

  // Show sample data in a dialog
  const handleViewSampleData = () => {
    // Create sample data based on business type
    const getSampleData = () => {
      const baseData = {
        name: "John Smith",
        phone: "+1 555-123-4567",
        email: "john.smith@email.com"
      };

      switch (businessType) {
        case 'medical':
          return [
            { ...baseData, appointmentType: "Annual Checkup", appointmentTime: "2024-01-15 10:00:00", notes: "Routine visit" },
            { name: "Jane Doe", phone: "+1 555-987-6543", email: "jane.doe@email.com", appointmentType: "Consultation", appointmentTime: "2024-01-16 14:30:00", notes: "Follow-up" },
            { name: "Bob Johnson", phone: "+1 555-456-7890", email: "bob.johnson@email.com", appointmentType: "Physical Therapy", appointmentTime: "2024-01-17 09:15:00", notes: "" }
          ];
        case 'restaurant':
          return [
            { ...baseData, appointmentType: "Dinner Reservation", appointmentTime: "2024-01-15 19:00:00", partySize: "4", notes: "Anniversary dinner" },
            { name: "Sarah Wilson", phone: "+1 555-234-5678", email: "sarah.wilson@email.com", appointmentType: "Lunch Meeting", appointmentTime: "2024-01-16 12:30:00", partySize: "6", notes: "Business lunch" },
            { name: "Mike Brown", phone: "+1 555-345-6789", email: "mike.brown@email.com", appointmentType: "Birthday Party", appointmentTime: "2024-01-17 18:00:00", partySize: "8", notes: "Kids birthday party" }
          ];
        case 'salon':
          return [
            { ...baseData, appointmentType: "Haircut & Style", appointmentTime: "2024-01-15 10:00:00", duration: "60", notes: "Regular client" },
            { name: "Lisa Garcia", phone: "+1 555-567-8901", email: "lisa.garcia@email.com", appointmentType: "Color & Highlights", appointmentTime: "2024-01-16 14:00:00", duration: "120", notes: "Root touch-up" },
            { name: "Tom Davis", phone: "+1 555-678-9012", email: "tom.davis@email.com", appointmentType: "Beard Trim", appointmentTime: "2024-01-17 11:30:00", duration: "30", notes: "" }
          ];
        default:
          return [
            { ...baseData, appointmentType: "Consultation", appointmentTime: "2024-01-15 10:00:00", notes: "Initial meeting" },
            { name: "Emma Taylor", phone: "+1 555-789-0123", email: "emma.taylor@email.com", appointmentType: "Follow-up", appointmentTime: "2024-01-16 15:00:00", notes: "Progress review" },
            { name: "Chris Lee", phone: "+1 555-890-1234", email: "chris.lee@email.com", appointmentType: "Service Call", appointmentTime: "2024-01-17 13:00:00", notes: "Scheduled maintenance" }
          ];
      }
    };

    const sampleData = getSampleData();
    const sampleText = sampleData.map(row => 
      Object.entries(row).map(([key, value]) => `${key}: ${value}`).join(', ')
    ).join('\n\n');
    
    toast({
      title: "Sample Data Preview",
      description: sampleText.length > 300 ? sampleText.substring(0, 300) + '...' : sampleText,
    });
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderFileUploadStep();
      case 2:
        return renderFieldMappingStep();
      case 3:
        return renderDataValidationStep();
      case 4:
        return renderGroupConfigurationStep();
      case 5:
        return renderImportPreviewStep();
      case 6:
        return renderImportProgressStep();
      default:
        return null;
    }
  };

  // Step 1: File Upload UI
  const renderFileUploadStep = () => (
    <div className="space-y-6">
      <div 
        className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-primary/50 transition-colors"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        data-testid="csv-upload-drop-zone"
      >
        <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Upload CSV File</h3>
        <p className="text-muted-foreground mb-4">
          Drag and drop your CSV file here, or click to browse
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          Supports CSV files only (max 10MB, 10,000 rows)
        </p>
        
        <Button onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Browse Files
            </>
          )}
        </Button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
          }}
          className="hidden"
          data-testid="csv-file-input"
        />
      </div>

      {/* Business Type Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            CSV Templates for {businessConfig.fieldLabels?.name?.split(' ')[0] || 'Business'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Download a template CSV file for your business type to ensure proper formatting:
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate} data-testid="button-download-template">
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
            <Button variant="outline" size="sm" onClick={handleViewSampleData} data-testid="button-view-sample">
              <Eye className="w-4 h-4 mr-2" />
              View Sample Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Helper function to update field mapping
  const updateFieldMapping = (csvColumn: string, contactField: ContactFieldType | '' | '_none') => {
    const actualField = contactField === '_none' ? '' : contactField;
    setFieldMappings(prev => prev.map(mapping => 
      mapping.csvColumn === csvColumn 
        ? { 
            ...mapping, 
            contactField: actualField,
            required: actualField ? businessConfig.requiredFields.includes(actualField) : false,
            confidence: actualField ? 85 : 0 // Manual mapping gets high confidence
          }
        : mapping
    ));
    
    // Clear validation errors when field mappings change
    setValidationErrors([]);
  };

  // Get confidence color for UI
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 80) return 'text-green-600 bg-green-50';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-50';
    if (confidence >= 40) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  // Step 2: Interactive Field Mapping UI
  const renderFieldMappingStep = () => {
    if (!csvFile || fieldMappings.length === 0) {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Map CSV Fields</h3>
          <p className="text-muted-foreground">No CSV file loaded. Please go back to upload a file.</p>
        </div>
      );
    }

    const requiredFieldsCount = fieldMappings.filter(m => m.required && m.contactField).length;
    const totalRequiredFields = businessConfig.requiredFields.length;
    const mappingComplete = requiredFieldsCount === totalRequiredFields;

    return (
      <TooltipProvider>
        <div className="space-y-6">
          {/* Header with file info and progress */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Map CSV Fields to Contact Fields</h3>
              <p className="text-sm text-muted-foreground">
                {csvFile.file.name} • {csvFile.rowCount} rows • {csvFile.headers.length} columns
              </p>
            </div>
            <div className="text-sm">
              <Badge variant={mappingComplete ? "default" : "secondary"}>
                Required Fields: {requiredFieldsCount}/{totalRequiredFields}
              </Badge>
            </div>
          </div>

          {/* Required fields warning */}
          {!mappingComplete && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-orange-800">Required Fields Missing</p>
                    <p className="text-xs text-orange-600 mt-1">
                      Please map all required fields: {businessConfig.requiredFields
                        .filter(field => !fieldMappings.find(m => m.contactField === field))
                        .map(field => businessConfig.fieldLabels[field])
                        .join(', ')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Field mapping table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4" />
                Column Mapping
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {fieldMappings.map((mapping, index) => (
                    <div key={mapping.csvColumn} className="grid grid-cols-12 gap-4 items-center p-3 border rounded-lg">
                      {/* CSV Column Info */}
                      <div className="col-span-3">
                        <div className="font-medium text-sm">{mapping.csvColumn}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {mapping.sampleValues.length > 0 && (
                            <span>Sample: {mapping.sampleValues[0]}</span>
                          )}
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="col-span-1 flex justify-center">
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>

                      {/* Contact Field Selection */}
                      <div className="col-span-4">
                        <Select
                          value={mapping.contactField || ""}
                          onValueChange={(value) => updateFieldMapping(mapping.csvColumn, value as ContactFieldType | '')}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select field..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none">-- No mapping --</SelectItem>
                            {businessConfig.requiredFields.map(field => (
                              <SelectItem key={field} value={field}>
                                {businessConfig.fieldLabels[field]} (Required)
                              </SelectItem>
                            ))}
                            {businessConfig.optionalFields.map(field => (
                              <SelectItem key={`optional-${field}`} value={field}>
                                {businessConfig.fieldLabels[field]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Confidence Score */}
                      <div className="col-span-2">
                        {mapping.confidence > 0 && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge 
                                variant="secondary" 
                                className={`text-xs ${getConfidenceColor(mapping.confidence)}`}
                              >
                                {mapping.confidence}% confidence
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Auto-detected with {mapping.confidence}% confidence</p>
                              {mapping.suggestions && mapping.suggestions.length > 0 && (
                                <p className="text-xs mt-1">
                                  Alternatives: {mapping.suggestions.slice(0, 2).join(', ')}
                                </p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>

                      {/* Sample Values */}
                      <div className="col-span-2">
                        {mapping.sampleValues.length > 0 && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Button variant="ghost" size="sm" className="h-6 text-xs">
                                <Eye className="w-3 h-3 mr-1" />
                                View samples
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <div className="space-y-1">
                                <p className="font-medium">Sample values:</p>
                                {mapping.sampleValues.map((sample, i) => (
                                  <p key={i} className="text-xs font-mono bg-muted px-1 rounded">
                                    {sample || '(empty)'}
                                  </p>
                                ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Mapping Statistics */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {fieldMappings.filter(m => m.confidence >= 80).length}
                  </div>
                  <div className="text-xs text-muted-foreground">High Confidence</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {fieldMappings.filter(m => m.confidence > 0 && m.confidence < 80).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Needs Review</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    {fieldMappings.filter(m => m.confidence === 0 || !m.contactField).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Not Mapped</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Business Type Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Info className="w-4 h-4" />
                {businessType.charAt(0).toUpperCase() + businessType.slice(1)} Business Template
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium mb-2">Required Fields:</div>
                  <div className="space-y-1">
                    {businessConfig.requiredFields.map(field => (
                      <div key={field} className="flex items-center gap-2">
                        {fieldMappings.find(m => m.contactField === field) ? (
                          <CheckCircle className="w-3 h-3 text-green-600" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-red-600" />
                        )}
                        <span className={fieldMappings.find(m => m.contactField === field) ? 'text-green-600' : 'text-red-600'}>
                          {businessConfig.fieldLabels[field]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="font-medium mb-2">Optional Fields:</div>
                  <div className="space-y-1">
                    {businessConfig.optionalFields.slice(0, 5).map(field => (
                      <div key={field} className="flex items-center gap-2">
                        {fieldMappings.find(m => m.contactField === field) ? (
                          <CheckCircle className="w-3 h-3 text-blue-600" />
                        ) : (
                          <div className="w-3 h-3 border border-gray-300 rounded-full" />
                        )}
                        <span className={fieldMappings.find(m => m.contactField === field) ? 'text-blue-600' : 'text-muted-foreground'}>
                          {businessConfig.fieldLabels[field]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>
    );
  };

  // Data validation helpers
  const validateContactRow = (row: string[], rowIndex: number): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    fieldMappings.forEach((mapping, colIndex) => {
      if (!mapping.contactField) return;
      
      const value = row[colIndex] || '';
      const field = mapping.contactField;
      
      // Required field validation
      if (mapping.required && !value.trim()) {
        errors.push({
          row: rowIndex + 1,
          column: mapping.csvColumn,
          value,
          error: `${businessConfig.fieldLabels[field]} is required`,
          severity: 'error',
          suggestion: 'Please provide a value for this field'
        });
        return;
      }
      
      if (!value.trim()) return; // Skip empty optional fields
      
      // HIPAA compliance validation (for medical practices)
      const hipaaValidation = validateHIPAACompliance(mapping.contactField, value, businessType);
      if (hipaaValidation) {
        errors.push({
          row: rowIndex + 1,
          column: mapping.csvColumn,
          value,
          error: hipaaValidation.error,
          severity: hipaaValidation.severity,
          suggestion: hipaaValidation.suggestion,
          hipaaViolation: hipaaValidation.hipaaViolation,
          phiType: hipaaValidation.phiType
        });
      }

      // Business-specific validation rules
      const businessValidation = validateBusinessSpecificField(field, value, businessType);
      if (businessValidation) {
        errors.push({
          row: rowIndex + 1,
          column: mapping.csvColumn,
          value,
          error: businessValidation.error,
          severity: businessValidation.severity,
          suggestion: businessValidation.suggestion,
          hipaaViolation: businessValidation.hipaaViolation,
          phiType: businessValidation.phiType
        });
      }
      
      // Data type validation
      const dataTypeValidation = validateFieldDataType(field, value);
      if (dataTypeValidation) {
        errors.push({
          row: rowIndex + 1,
          column: mapping.csvColumn,
          value,
          error: dataTypeValidation.error,
          severity: dataTypeValidation.severity,
          suggestion: dataTypeValidation.suggestion
        });
      }
    });
    
    return errors;
  };

  // HIPAA/PHI Detection Functions
  const detectPHI = (value: string, fieldType: ContactFieldType): { isPHI: boolean; phiType: 'direct' | 'quasi' | 'potential' | null; reason: string } => {
    const normalizedValue = value.toLowerCase().trim();
    
    // Direct identifiers (HIPAA "Safe Harbor" Rule - 18 identifiers)
    const directIdentifierPatterns = [
      // 1. Names (handled as contact field validation, not in content)
      // 2. Geographic subdivisions (handled below in quasi-identifiers)
      // 3. Dates (handled below in quasi-identifiers)
      // 4. Telephone/Fax numbers (beyond primary contact phone)
      { pattern: /\b(fax|home|work|mobile|cell)\s*(phone|number|tel)\s*:?\s*[\(\)\d\s\-\.\+]{7,}\b/i, reason: 'Secondary phone/fax number detected' },
      // 5. Email addresses (beyond primary contact email)
      { pattern: /\b(secondary|alternate|emergency|contact)\s*email\s*:?\s*[^\s@]+@[^\s@]+\.[^\s@]+\b/i, reason: 'Secondary email address detected' },
      // 6. Social Security Numbers
      { pattern: /\b\d{3}-\d{2}-\d{4}\b|\b\d{9}\b/, reason: 'Social Security Number detected' },
      // 7. Medical Record Numbers
      { pattern: /\b(mrn|medical|record|patient)\s*#?\s*:?\s*[a-z0-9]{6,}\b/i, reason: 'Medical Record Number detected' },
      // 8. Health plan beneficiary numbers
      { pattern: /\b(insurance|policy|member|beneficiary|subscriber)\s*#?\s*:?\s*[a-z0-9]{6,}\b/i, reason: 'Health plan beneficiary number detected' },
      // 9. Account numbers
      { pattern: /\b(account|acct)\s*#?\s*:?\s*[a-z0-9]{6,}\b/i, reason: 'Account number detected' },
      // 10. Certificate/license numbers
      { pattern: /\b(license|certificate|cert|permit)\s*#?\s*:?\s*[a-z0-9]{6,}\b/i, reason: 'Certificate/license number detected' },
      // 11. Vehicle identifiers
      { pattern: /\b(vin|vehicle|plate|license)\s*(number|id|identifier)\s*:?\s*[a-z0-9]{6,}\b/i, reason: 'Vehicle identifier detected' },
      // 12. Device identifiers and serial numbers
      { pattern: /\b(device|serial|equipment)\s*(number|id|identifier)\s*:?\s*[a-z0-9]{6,}\b/i, reason: 'Device/serial number detected' },
      // 13. Web URLs
      { pattern: /\bhttps?:\/\/[^\s]+|www\.[^\s]+\.[a-z]{2,}/i, reason: 'Web URL detected' },
      // 14. IP addresses
      { pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/, reason: 'IP address detected' },
      // 15. Biometric identifiers
      { pattern: /\b(fingerprint|retina|voiceprint|dna|genetic|biometric)\b/i, reason: 'Biometric identifier detected' },
      // 16. Full face photos
      { pattern: /\b(photo|picture|image|facial)\b.*\b(full|face|patient)\b/i, reason: 'Facial photograph reference detected' },
      // 17. Any other unique identifying number
      { pattern: /\b(patient|medical|unique)\s*(id|identifier|number)\s*:?\s*[a-z0-9]{6,}\b/i, reason: 'Unique identifier detected' },
      // 18. Any other identifying characteristic (handled in medical terminology)
    ];

    // Quasi-identifiers (can be PHI when combined)
    const quasiIdentifierPatterns = [
      // Dates related to patient
      { pattern: /\b(birth|death|admission|discharge|surgery|treatment)\s*date\b/i, reason: 'Patient-related date detected' },
      // Geographic subdivisions smaller than state
      { pattern: /\b(zip|postal|apartment|suite|room|floor|building)\s*(code|#|number)?\s*:?\s*\d/i, reason: 'Geographic subdivision detected' },
      // Age over 89
      { pattern: /\b(age|aged|years?)\s*:?\s*(9[0-9]|[1-9][0-9]{2,})\b/i, reason: 'Age over 89 detected' },
    ];

    // Potential PHI based on field type and context
    const potentialPHIFields: Record<ContactFieldType, string> = {
      'notes': 'Free-text notes may contain medical information',
      'comments': 'Comments may contain sensitive patient details',
      'diagnosis': 'Diagnosis information is PHI',
      'medication': 'Medication information is PHI', 
      'allergies': 'Allergy information is PHI',
      'symptoms': 'Symptom information is PHI',
      'treatment': 'Treatment information is PHI',
      'condition': 'Medical condition information is PHI',
      'familyHistory': 'Family medical history is PHI',
      'emergencyContact': 'Emergency contact with medical relationship is quasi-PHI'
    };

    // Check for direct identifiers
    for (const { pattern, reason } of directIdentifierPatterns) {
      if (pattern.test(value)) {
        return { isPHI: true, phiType: 'direct', reason };
      }
    }

    // Check for quasi-identifiers
    for (const { pattern, reason } of quasiIdentifierPatterns) {
      if (pattern.test(value)) {
        return { isPHI: true, phiType: 'quasi', reason };
      }
    }

    // Check for potential PHI based on field type
    if (fieldType && potentialPHIFields[fieldType]) {
      return { isPHI: true, phiType: 'potential', reason: potentialPHIFields[fieldType] };
    }

    // Medical terminology detection
    const medicalTerms = [
      'diagnosis', 'prescription', 'medication', 'treatment', 'therapy', 'surgery', 'procedure',
      'symptom', 'condition', 'disease', 'disorder', 'syndrome', 'allergy', 'adverse', 'reaction',
      'blood', 'pressure', 'diabetes', 'cancer', 'tumor', 'malignant', 'benign', 'chronic',
      'acute', 'pain', 'infection', 'fever', 'nausea', 'vomit', 'diarrhea', 'constipation'
    ];

    if (medicalTerms.some(term => normalizedValue.includes(term))) {
      return { isPHI: true, phiType: 'potential', reason: 'Medical terminology detected' };
    }

    return { isPHI: false, phiType: null, reason: '' };
  };

  const validateHIPAACompliance = (field: ContactFieldType, value: string, businessType: BusinessType): ValidationError | null => {
    if (businessType !== 'medical') {
      return null; // HIPAA only applies to medical practices
    }

    const phiDetection = detectPHI(value, field);
    
    if (phiDetection.isPHI) {
      const severity = phiDetection.phiType === 'direct' ? 'error' : 'warning';
      const isBlocking = phiDetection.phiType === 'direct';
      
      return {
        row: 0, column: '', value,
        error: `HIPAA Violation: ${phiDetection.reason}`,
        severity,
        suggestion: phiDetection.phiType === 'direct' 
          ? 'Remove this information or use de-identified data'
          : 'Review for potential PHI - consider de-identification',
        hipaaViolation: true,
        phiType: phiDetection.phiType
      };
    }

    // Check for restricted fields in medical context
    const restrictedFields: ContactFieldType[] = ['notes', 'comments', 'diagnosis', 'medication', 'allergies'];
    if (restrictedFields.includes(field)) {
      return {
        row: 0, column: '', value,
        error: 'Field may contain PHI and should be avoided in CSV imports',
        severity: 'warning',
        suggestion: 'Consider using alternative fields or ensure data is de-identified',
        hipaaViolation: true,
        phiType: 'potential'
      };
    }

    return null;
  };

  // Business-specific validation rules
  const validateBusinessSpecificField = (field: ContactFieldType, value: string, businessType: BusinessType): ValidationError | null => {
    // Medical practice specific validations (HIPAA compliance)
    if (businessType === 'medical') {
      if (field === 'notes' && businessConfig.restrictedFields?.includes('notes')) {
        return {
          row: 0, column: '', value, 
          error: 'Notes field may contain PHI and should be avoided in CSV imports',
          severity: 'warning',
          suggestion: 'Consider using specialInstructions field instead for HIPAA compliance'
        };
      }
      
      if (field === 'appointmentType') {
        const validMedicalTypes = ['consultation', 'follow-up', 'procedure', 'examination', 'surgery', 'therapy'];
        if (!validMedicalTypes.some(type => value.toLowerCase().includes(type.toLowerCase()))) {
          return {
            row: 0, column: '', value,
            error: 'Appointment type should be medical-related',
            severity: 'warning',
            suggestion: `Consider using: ${validMedicalTypes.slice(0, 3).join(', ')}`
          };
        }
      }
    }
    
    // Salon specific validations
    if (businessType === 'salon') {
      if (field === 'serviceType') {
        const validSalonServices = ['haircut', 'color', 'highlights', 'perm', 'styling', 'facial', 'manicure', 'pedicure'];
        if (!validSalonServices.some(service => value.toLowerCase().includes(service.toLowerCase()))) {
          return {
            row: 0, column: '', value,
            error: 'Service type should be salon-related',
            severity: 'warning',
            suggestion: `Consider using: ${validSalonServices.slice(0, 3).join(', ')}`
          };
        }
      }
    }
    
    // Restaurant specific validations
    if (businessType === 'restaurant') {
      if (field === 'partySize') {
        const size = parseInt(value);
        if (isNaN(size) || size < 1 || size > 20) {
          return {
            row: 0, column: '', value,
            error: 'Party size should be between 1 and 20',
            severity: 'error',
            suggestion: 'Enter a valid number between 1 and 20'
          };
        }
      }
    }
    
    return null;
  };

  // Data type specific validation
  const validateFieldDataType = (field: ContactFieldType, value: string): ValidationError | null => {
    switch (field) {
      case 'phone':
        // Phone number validation
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$|^[\(\)\d\s\-\.\+]{7,}$/;
        if (!phoneRegex.test(value.replace(/\s/g, ''))) {
          return {
            row: 0, column: '', value,
            error: 'Invalid phone number format',
            severity: 'error',
            suggestion: 'Use format: +1234567890 or (123) 456-7890'
          };
        }
        break;
        
      case 'email':
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return {
            row: 0, column: '', value,
            error: 'Invalid email format',
            severity: 'error',
            suggestion: 'Use format: name@example.com'
          };
        }
        break;
        
      case 'appointmentDate':
        // Date validation
        const parsedDate = new Date(value);
        if (isNaN(parsedDate.getTime())) {
          return {
            row: 0, column: '', value,
            error: 'Invalid date format',
            severity: 'error',
            suggestion: 'Use format: YYYY-MM-DD or MM/DD/YYYY'
          };
        }
        
        // Future date validation
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (parsedDate < today) {
          return {
            row: 0, column: '', value,
            error: 'Appointment date is in the past',
            severity: 'warning',
            suggestion: 'Verify this is a future appointment date'
          };
        }
        break;
        
      case 'appointmentTime':
        // Time validation
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9](\s?(AM|PM|am|pm))?$|^(1[0-2]|0?[1-9]):[0-5][0-9]\s?(AM|PM|am|pm)$/;
        if (!timeRegex.test(value)) {
          return {
            row: 0, column: '', value,
            error: 'Invalid time format',
            severity: 'error',
            suggestion: 'Use format: 14:30 or 2:30 PM'
          };
        }
        break;
        
      case 'duration':
        // Duration validation
        const duration = parseInt(value);
        if (isNaN(duration) || duration < 15 || duration > 480) {
          return {
            row: 0, column: '', value,
            error: 'Duration should be between 15 and 480 minutes',
            severity: 'warning',
            suggestion: 'Enter duration in minutes (15-480)'
          };
        }
        break;
    }
    
    return null;
  };

  // Run validation on all data
  const runDataValidation = () => {
    if (!csvFile) {
      setValidationErrors([]);
      return [];
    }
    
    console.log('Running validation on', csvFile.rowCount, 'rows');
    let allErrors: ValidationError[] = [];
    csvFile.rows.forEach((row, index) => {
      const rowErrors = validateContactRow(row, index);
      allErrors = [...allErrors, ...rowErrors];
    });
    
    console.log('Validation completed, found', allErrors.length, 'issues');
    setValidationErrors(allErrors);
    return allErrors;
  };

  // Step 3: Data Validation UI
  const renderDataValidationStep = () => {
    if (!csvFile || fieldMappings.length === 0) {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Validate Data</h3>
          <p className="text-muted-foreground">No CSV data loaded. Please go back to upload and map fields.</p>
        </div>
      );
    }

    // Run validation if not already done or if there's no validation data
    if (validationErrors.length === 0 && csvFile) {
      setTimeout(() => runDataValidation(), 100);
    }

    const errorsByRow = validationErrors.reduce((acc, error) => {
      if (!acc[error.row]) acc[error.row] = [];
      acc[error.row].push(error);
      return acc;
    }, {} as Record<number, ValidationError[]>);

    const totalErrors = validationErrors.filter(e => e.severity === 'error').length;
    const totalWarnings = validationErrors.filter(e => e.severity === 'warning').length;
    const hipaaViolations = validationErrors.filter(e => e.hipaaViolation).length;
    const directPHI = validationErrors.filter(e => e.phiType === 'direct').length;
    const validRows = csvFile.rowCount - Object.keys(errorsByRow).length;

    return (
      <TooltipProvider>
        <div className="space-y-6">
          {/* Header with validation summary */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Data Validation</h3>
              <p className="text-sm text-muted-foreground">
                Validating {csvFile.rowCount} rows with {businessType} business rules
              </p>
            </div>
            <div className="flex gap-2">
              <Select
                value={businessType}
                onValueChange={(value: BusinessType) => setBusinessTypeForTesting(value)}
              >
                <SelectTrigger className="w-32" data-testid="business-type-selector">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="medical">Medical</SelectItem>
                  <SelectItem value="salon">Salon</SelectItem>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                  <SelectItem value="consultant">Consultant</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={runDataValidation} data-testid="revalidate-button">
                <RefreshCw className="w-4 h-4 mr-2" />
                Re-validate
              </Button>
            </div>
          </div>

          {/* Validation Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600" data-testid="valid-rows-count">{validRows}</div>
                  <div className="text-xs text-muted-foreground">Valid Rows</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600" data-testid="errors-count">{totalErrors}</div>
                  <div className="text-xs text-muted-foreground">Errors</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600" data-testid="warnings-count">{totalWarnings}</div>
                  <div className="text-xs text-muted-foreground">Warnings</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600" data-testid="data-quality-percentage">
                    {Math.round((validRows / csvFile.rowCount) * 100)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Data Quality</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* HIPAA Compliance Summary for Medical Practices */}
          {businessType === 'medical' && (
            <Card className="border-purple-200 bg-purple-50" data-testid="hipaa-compliance-summary">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="w-4 h-4 text-purple-600" />
                  HIPAA Compliance Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${hipaaViolations > 0 ? 'text-red-600' : 'text-green-600'}`} data-testid="hipaa-violations-count">
                      {hipaaViolations}
                    </div>
                    <div className="text-xs text-muted-foreground">HIPAA Issues</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${directPHI > 0 ? 'text-red-600' : 'text-green-600'}`} data-testid="direct-phi-count">
                      {directPHI}
                    </div>
                    <div className="text-xs text-muted-foreground">Direct PHI</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${hipaaViolations === 0 ? 'text-green-600' : 'text-yellow-600'}`} data-testid="compliance-status">
                      {hipaaViolations === 0 ? '✓' : '⚠'}
                    </div>
                    <div className="text-xs text-muted-foreground">Compliance</div>
                  </div>
                </div>
                
                {hipaaViolations > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-800">HIPAA Compliance Issues Detected</p>
                        <p className="text-xs text-red-600 mt-1">
                          {directPHI > 0 && 'Contains direct PHI that must be removed. '}
                          Review all flagged data before importing.
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-purple-700 bg-purple-100 p-2 rounded">
                      <strong>HIPAA Guidance:</strong> Protected Health Information (PHI) includes names, dates of birth, SSNs, medical record numbers, and medical information. 
                      All PHI must be de-identified before CSV import or processed under proper HIPAA safeguards.
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <p className="text-sm text-green-800">No HIPAA compliance issues detected. Data appears to be properly de-identified.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Errors blocking import */}
          {totalErrors > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Import Blocked</p>
                    <p className="text-xs text-red-600 mt-1">
                      {totalErrors} error(s) must be fixed before importing. Warnings can be ignored.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Validation Issues List */}
          {validationErrors.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Validation Issues ({validationErrors.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {validationErrors.slice(0, 50).map((error, index) => (
                      <div key={index} className={`p-3 rounded-lg border ${
                        error.hipaaViolation 
                          ? 'border-purple-300 bg-purple-50' 
                          : error.severity === 'error' 
                            ? 'border-red-200 bg-red-50' 
                            : 'border-yellow-200 bg-yellow-50'
                      }`} data-testid={`validation-error-${index}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {error.hipaaViolation ? (
                                <Settings className="w-4 h-4 text-purple-600" />
                              ) : error.severity === 'error' ? (
                                <AlertCircle className="w-4 h-4 text-red-600" />
                              ) : (
                                <Info className="w-4 h-4 text-yellow-600" />
                              )}
                              <span className="font-medium text-sm" data-testid={`error-location-${index}`}>
                                Row {error.row}: {error.column}
                              </span>
                              <Badge variant="secondary" className={
                                error.hipaaViolation 
                                  ? 'text-purple-700 bg-purple-100'
                                  : error.severity === 'error' 
                                    ? 'text-red-700' 
                                    : 'text-yellow-700'
                              } data-testid={`error-severity-${index}`}>
                                {error.hipaaViolation ? 'HIPAA' : error.severity}
                              </Badge>
                              {error.phiType && (
                                <Badge variant="outline" className="text-purple-700 border-purple-300" data-testid={`phi-type-${index}`}>
                                  {error.phiType === 'direct' ? 'Direct PHI' : 
                                   error.phiType === 'quasi' ? 'Quasi PHI' : 'Potential PHI'}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm mb-1" data-testid={`error-message-${index}`}>{error.error}</p>
                            <p className="text-xs text-muted-foreground" data-testid={`error-value-${index}`}>
                              Value: <code className="bg-muted px-1 rounded">{error.value || '(empty)'}</code>
                            </p>
                            {error.suggestion && (
                              <p className={`text-xs mt-1 ${error.hipaaViolation ? 'text-purple-600' : 'text-blue-600'}`} data-testid={`error-suggestion-${index}`}>
                                💡 {error.suggestion}
                              </p>
                            )}
                            {error.hipaaViolation && businessType === 'medical' && (
                              <p className="text-xs text-purple-700 mt-2 bg-purple-100 p-2 rounded">
                                <strong>HIPAA Notice:</strong> This field contains Protected Health Information. 
                                {error.phiType === 'direct' && ' This must be removed or de-identified before import.'}
                                {error.phiType === 'quasi' && ' This may be PHI when combined with other data.'}
                                {error.phiType === 'potential' && ' Review for medical information that should be de-identified.'}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {validationErrors.length > 50 && (
                      <div className="text-center text-sm text-muted-foreground py-4">
                        Showing first 50 issues. Total: {validationErrors.length}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4">
                <div className="text-center">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="font-medium text-green-800">All Data Validated Successfully!</p>
                  <p className="text-sm text-green-600 mt-1">
                    All {csvFile.rowCount} rows passed validation checks. Ready to proceed.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Business Type Validation Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Info className="w-4 h-4" />
                {businessType.charAt(0).toUpperCase() + businessType.slice(1)} Validation Rules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-2">
                <p><strong>Required Fields:</strong> All rows must have {businessConfig.requiredFields.map(f => businessConfig.fieldLabels[f]).join(', ')}</p>
                <p><strong>Data Formats:</strong> Phone numbers, emails, dates, and times are validated</p>
                {businessType === 'medical' && (
                  <p className="text-blue-600"><strong>HIPAA Compliance:</strong> PHI detection and restricted field warnings applied</p>
                )}
                {businessType === 'restaurant' && (
                  <p className="text-blue-600"><strong>Restaurant Rules:</strong> Party size limits (1-20), reservation time validation</p>
                )}
                {businessType === 'salon' && (
                  <p className="text-blue-600"><strong>Salon Rules:</strong> Service type validation, appointment duration checks</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>
    );
  };

  // Group assignment helpers
  const detectGroupColumns = (): string[] => {
    if (!csvFile) return [];
    
    const groupKeywords = ['group', 'groups', 'category', 'categories', 'department', 'dept', 'team', 'division', 'section', 'type', 'classification', 'tag', 'tags'];
    const headers = csvFile.headers.map(h => h.toLowerCase());
    
    return csvFile.headers.filter((header, index) => 
      groupKeywords.some(keyword => 
        headers[index].includes(keyword) || 
        header.toLowerCase() === keyword
      )
    );
  };

  const extractGroupValues = (groupColumn: string): GroupValue[] => {
    if (!csvFile) return [];
    
    const columnIndex = csvFile.headers.indexOf(groupColumn);
    if (columnIndex === -1) return [];
    
    const valuesMap = new Map<string, GroupValue>();
    
    csvFile.rows.forEach((row, rowIndex) => {
      const cellValue = row[columnIndex]?.toString().trim() || '';
      if (cellValue) {
        // Parse multi-value cells (comma, semicolon, pipe separated)
        const values = cellValue.split(/[,;|]/).map(v => v.trim()).filter(v => v.length > 0);
        
        values.forEach(value => {
          const cleanValue = value.toLowerCase().trim();
          if (cleanValue) {
            if (!valuesMap.has(cleanValue)) {
              valuesMap.set(cleanValue, {
                originalValue: value.trim(), // Preserve original casing
                normalizedValue: cleanValue,
                count: 1,
                action: 'create', // Default to creating new groups
                targetGroupId: null,
                rows: [rowIndex + 1]
              });
            } else {
              const existing = valuesMap.get(cleanValue)!;
              existing.count++;
              if (!existing.rows.includes(rowIndex + 1)) {
                existing.rows.push(rowIndex + 1);
              }
            }
          }
        });
      }
    });
    
    return Array.from(valuesMap.values()).sort((a, b) => b.count - a.count);
  };

  const getSelectedGroupColumn = (): string | null => {
    if (selectedGroupColumn) return selectedGroupColumn;
    const detected = detectGroupColumns();
    return detected.length > 0 ? detected[0] : null;
  };

  // Initialize group assignments when entering Step 4
  useEffect(() => {
    if (currentStep === 4 && csvFile && groupAssignments.length === 0) {
      const detected = detectGroupColumns();
      if (detected.length > 0) {
        const defaultColumn = selectedGroupColumn || detected[0];
        setSelectedGroupColumn(defaultColumn);
        const values = extractGroupValues(defaultColumn);
        setGroupAssignments(values);
      }
    }
  }, [currentStep, csvFile, selectedGroupColumn]);

  // Clear group state when CSV changes
  useEffect(() => {
    setGroupAssignments([]);
    setSelectedGroupColumn(null);
  }, [csvFile]);

  const getGroupValues = (): GroupValue[] => {
    const column = getSelectedGroupColumn();
    return column ? extractGroupValues(column) : [];
  };

  const updateGroupAssignment = (normalizedValue: string, action: 'create' | 'assign' | 'skip', targetGroupId?: string) => {
    setGroupAssignments(prev => 
      prev.map(assignment => 
        assignment.normalizedValue === normalizedValue 
          ? { ...assignment, action, targetGroupId: targetGroupId || null }
          : assignment
      )
    );
  };

  // Fetch existing contact groups for assignment
  const { data: existingGroups = [] } = useQuery({
    queryKey: ['/api/contact-groups'],
    enabled: currentStep === 4 && isOpen, // Only fetch when on Step 4 and modal is open
  });

  // Generate import preview data from group assignments
  const generateGroupImportData = () => {
    const groupsToCreate = groupAssignments
      .filter(assignment => assignment.action === 'create')
      .map(assignment => assignment.originalValue);
    
    const contactGroupAssignments: Record<number, string[]> = {};
    
    if (csvFile && selectedGroupColumn) {
      const columnIndex = csvFile.headers.indexOf(selectedGroupColumn);
      if (columnIndex !== -1) {
        csvFile.rows.forEach((row, rowIndex) => {
          const cellValue = row[columnIndex]?.toString().trim() || '';
          if (cellValue) {
            const values = cellValue.split(/[,;|]/).map(v => v.trim()).filter(v => v.length > 0);
            const assignedGroups: string[] = [];
            
            values.forEach(value => {
              const cleanValue = value.toLowerCase().trim();
              const assignment = groupAssignments.find(a => a.normalizedValue === cleanValue);
              
              if (assignment?.action === 'create') {
                assignedGroups.push(assignment.originalValue);
              } else if (assignment?.action === 'assign' && assignment.targetGroupId) {
                const existingGroup = existingGroups.find(g => g.id === assignment.targetGroupId);
                if (existingGroup) {
                  assignedGroups.push(existingGroup.name);
                }
              }
            });
            
            if (assignedGroups.length > 0) {
              contactGroupAssignments[rowIndex] = assignedGroups;
            }
          }
        });
      }
    }
    
    return { groupsToCreate, contactGroupAssignments };
  };

  // Step 4: Group Configuration UI
  const renderGroupConfigurationStep = () => {
    if (!csvFile || fieldMappings.length === 0) {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Configure Groups</h3>
          <p className="text-muted-foreground">No CSV data loaded. Please go back to upload and map fields.</p>
        </div>
      );
    }

    const detectedColumns = detectGroupColumns();
    const selectedColumn = getSelectedGroupColumn();
    
    // Initialize group assignments if not already done
    if (groupAssignments.length === 0 && selectedColumn) {
      const values = extractGroupValues(selectedColumn);
      setGroupAssignments(values);
    }

    const totalContacts = csvFile.rowCount;
    const contactsWithGroups = groupAssignments.reduce((sum, assignment) => sum + assignment.count, 0);
    const contactsWithoutGroups = totalContacts - contactsWithGroups;
    const newGroupsToCreate = groupAssignments.filter(a => a.action === 'create').length;
    const groupsToAssign = groupAssignments.filter(a => a.action === 'assign').length;

    return (
      <TooltipProvider>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Configure Groups</h3>
              <p className="text-sm text-muted-foreground">
                Organize contacts into groups based on CSV data
              </p>
            </div>
          </div>

          {/* Group Column Detection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Group Column Detection
              </CardTitle>
            </CardHeader>
            <CardContent>
              {detectedColumns.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium">
                      Found {detectedColumns.length} potential group column(s)
                    </span>
                  </div>
                  <div className="space-y-2">
                    {detectedColumns.map((column, index) => (
                      <div key={column} className={`p-2 rounded border ${
                        index === 0 ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{column}</span>
                          {index === 0 && (
                            <Badge variant="secondary" className="text-blue-700">
                              Selected
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {extractGroupValues(column).length} unique values found
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Info className="w-4 h-4" />
                  <span className="text-sm">
                    No group columns detected. Contacts will be imported without group assignments.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Group Assignment Summary */}
          {selectedColumn && groupAssignments.length > 0 && (
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600" data-testid="contacts-with-groups-count">{contactsWithGroups}</div>
                    <div className="text-xs text-muted-foreground">With Groups</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600" data-testid="contacts-without-groups-count">{contactsWithoutGroups}</div>
                    <div className="text-xs text-muted-foreground">Without Groups</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600" data-testid="new-groups-count">{newGroupsToCreate}</div>
                    <div className="text-xs text-muted-foreground">New Groups</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600" data-testid="existing-groups-assign-count">{groupsToAssign}</div>
                    <div className="text-xs text-muted-foreground">Existing Groups</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Group Assignments Table */}
          {selectedColumn && groupAssignments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Group Assignments ({groupAssignments.length} groups)
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configure how CSV group values should be handled
                </p>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {groupAssignments.map((assignment, index) => (
                      <div key={assignment.normalizedValue} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`group-assignment-${assignment.normalizedValue}`}>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium" data-testid={`group-value-${assignment.normalizedValue}`}>{assignment.originalValue}</span>
                            <Badge variant="outline" data-testid={`group-count-${assignment.normalizedValue}`}>
                              {assignment.count} contact{assignment.count > 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground" data-testid={`group-rows-${assignment.normalizedValue}`}>
                            Rows: {assignment.rows.slice(0, 5).join(', ')}
                            {assignment.rows.length > 5 && ` +${assignment.rows.length - 5} more`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={assignment.action}
                            onValueChange={(value: 'create' | 'assign' | 'skip') => 
                              updateGroupAssignment(assignment.normalizedValue, value)
                            }
                          >
                            <SelectTrigger className="w-32" data-testid={`group-action-select-${assignment.normalizedValue}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="create">Create New</SelectItem>
                              <SelectItem value="assign">Assign Existing</SelectItem>
                              <SelectItem value="skip">Skip</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          {assignment.action === 'assign' && (
                            <Select
                              value={assignment.targetGroupId || ''}
                              onValueChange={(value) => 
                                updateGroupAssignment(assignment.normalizedValue, 'assign', value)
                              }
                            >
                              <SelectTrigger className="w-40" data-testid={`existing-group-select-${assignment.normalizedValue}`}>
                                <SelectValue placeholder="Select group..." />
                              </SelectTrigger>
                              <SelectContent>
                                {existingGroups.length > 0 ? (
                                  existingGroups.map((group) => (
                                    <SelectItem key={group.id} value={group.id}>
                                      {group.name}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="" disabled>
                                    No existing groups found
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* No Groups Found */}
          {(!selectedColumn || groupAssignments.length === 0) && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-4">
                <div className="text-center">
                  <Tag className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="font-medium text-blue-800">No Group Data Found</p>
                  <p className="text-sm text-blue-600 mt-1">
                    Contacts will be imported without group assignments. You can organize them later.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Auto-Creation Settings */}
          {newGroupsToCreate > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Group Creation Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm">
                      {newGroupsToCreate} new group(s) will be created automatically
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    New groups will be created with the same name as shown in your CSV file.
                    You can rename or organize them later in the Groups section.
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </TooltipProvider>
    );
  };

  // Step 5: Import Preview with Appointment Scheduling
  const renderImportPreviewStep = () => {
    if (!csvFile || fieldMappings.length === 0) {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Preview Import</h3>
          <p className="text-muted-foreground">No CSV data loaded. Please go back to complete previous steps.</p>
        </div>
      );
    }

    // Extract appointment data from CSV
    const appointmentData = csvFile.rows.map((row, index) => {
      const contact: any = {};
      fieldMappings.forEach(mapping => {
        if (mapping.contactField && mapping.csvColumn) {
          const columnIndex = csvFile.headers.indexOf(mapping.csvColumn);
          if (columnIndex !== -1) {
            contact[mapping.contactField] = row[columnIndex];
          }
        }
      });
      return { ...contact, rowIndex: index };
    });

    // Analyze appointment scheduling data
    const appointmentsWithDates = appointmentData.filter(contact => 
      contact.appointmentDate && contact.appointmentTime
    );
    
    const upcomingAppointments = appointmentsWithDates.filter(contact => {
      const appointmentDateTime = new Date(`${contact.appointmentDate} ${contact.appointmentTime}`);
      return appointmentDateTime > new Date();
    });

    const appointmentTypes = Array.from(new Set(appointmentData
      .map(contact => contact.appointmentType)
      .filter(Boolean)
    ));

    const todayDate = new Date().toDateString();
    const appointmentsToday = upcomingAppointments.filter(contact => {
      const appointmentDate = new Date(contact.appointmentDate);
      return appointmentDate.toDateString() === todayDate;
    });

    return (
      <TooltipProvider>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h3 className="text-lg font-semibold">Import Preview & Appointment Scheduling</h3>
            <p className="text-sm text-muted-foreground">
              Review your data before import and configure appointment scheduling options
            </p>
          </div>

          {/* Import Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600" data-testid="total-contacts-count">
                    {csvFile.rowCount}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Contacts</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600" data-testid="scheduled-appointments-count">
                    {appointmentsWithDates.length}
                  </div>
                  <div className="text-xs text-muted-foreground">With Appointments</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600" data-testid="upcoming-appointments-count">
                    {upcomingAppointments.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Upcoming</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600" data-testid="today-appointments-count">
                    {appointmentsToday.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Today</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Appointment Scheduling Configuration */}
          {upcomingAppointments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Appointment Scheduling Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Calendar Integration */}
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-sm">Calendar Integration</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        Sync appointments to external calendar systems
                      </p>
                      <div className="space-y-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full text-xs"
                          data-testid="calcom-sync-button"
                        >
                          📅 Sync to Cal.com
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full text-xs"
                          data-testid="calendly-sync-button"
                        >
                          📅 Sync to Calendly
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Voice Reminder Setup */}
                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Phone className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-sm">Voice Reminders</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        Configure AI voice appointment reminders
                      </p>
                      <div className="space-y-2">
                        <Select defaultValue="24h">
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1h">1 hour before</SelectItem>
                            <SelectItem value="24h">24 hours before</SelectItem>
                            <SelectItem value="48h">48 hours before</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full text-xs"
                          data-testid="setup-reminders-button"
                        >
                          📞 Setup Reminders
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Appointment Type Analysis */}
                {appointmentTypes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Appointment Types Found</h4>
                    <div className="flex flex-wrap gap-2">
                      {appointmentTypes.map((type, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Data Preview Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Data Preview</CardTitle>
              <p className="text-sm text-muted-foreground">
                First 5 rows of your import data
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      {fieldMappings
                        .filter(m => m.contactField)
                        .map((mapping, index) => (
                          <th key={index} className="text-left p-2 font-medium">
                            {businessConfig.fieldLabels[mapping.contactField as ContactFieldType] || mapping.contactField}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {appointmentData.slice(0, 5).map((contact, rowIndex) => (
                      <tr key={rowIndex} className="border-b">
                        {fieldMappings
                          .filter(m => m.contactField)
                          .map((mapping, colIndex) => (
                            <td key={colIndex} className="p-2">
                              <span className="truncate max-w-[100px] block">
                                {contact[mapping.contactField!] || '-'}
                              </span>
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {csvFile.rowCount > 5 && (
                <p className="text-xs text-muted-foreground mt-2">
                  ... and {csvFile.rowCount - 5} more rows
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>
    );
  };

  // Step 6: Import Progress with Appointment Creation
  const renderImportProgressStep = () => {
    const [currentPhase, setCurrentPhase] = useState<'contacts' | 'appointments' | 'reminders' | 'complete'>('contacts');
    const [contactsImported, setContactsImported] = useState(0);
    const [appointmentsCreated, setAppointmentsCreated] = useState(0);
    const [remindersScheduled, setRemindersScheduled] = useState(0);
    const [importErrors, setImportErrors] = useState<string[]>([]);
    const [createdContactIds, setCreatedContactIds] = useState<string[]>([]);
    
    const totalContacts = csvFile?.rowCount || 0;
    const appointmentData = csvFile ? csvFile.rows.map((row, index) => {
      const contact: any = {};
      fieldMappings.forEach(mapping => {
        if (mapping.contactField && mapping.csvColumn) {
          const columnIndex = csvFile.headers.indexOf(mapping.csvColumn);
          if (columnIndex !== -1) {
            contact[mapping.contactField] = row[columnIndex];
          }
        }
      });
      return { ...contact, rowIndex: index };
    }) : [];
    
    const upcomingAppointments = appointmentData.filter(contact => {
      if (!contact.appointmentDate || !contact.appointmentTime) return false;
      const appointmentDateTime = new Date(`${contact.appointmentDate} ${contact.appointmentTime}`);
      return appointmentDateTime > new Date();
    });

    const overallProgress = (() => {
      switch (currentPhase) {
        case 'contacts':
          return (contactsImported / totalContacts) * 25;
        case 'appointments':
          return 25 + (appointmentsCreated / upcomingAppointments.length) * 35;
        case 'reminders':
          return 60 + (remindersScheduled / upcomingAppointments.length) * 30;
        case 'complete':
          return 100;
        default:
          return 0;
      }
    })();

    // Real API mutations for import process
    const importContactsMutation = useMutation({
      mutationFn: async (contacts: any[]) => {
        return apiRequest('/api/import/contacts', 'POST', { contacts });
      },
      onSuccess: (data: any) => {
        setContactsImported(data.created);
        setCreatedContactIds(data.contactIds || []);
        if (data.errors && data.errors.length > 0) {
          setImportErrors(prev => [...prev, ...data.errors.map((e: any) => e.error)]);
        }
        setTimeout(() => setCurrentPhase('appointments'), 500);
      },
      onError: (error: any) => {
        setImportErrors(prev => [...prev, 'Failed to import contacts: ' + error.message]);
        setCurrentPhase('complete');
      },
    });

    const importAppointmentsMutation = useMutation({
      mutationFn: async (appointments: any[]) => {
        return apiRequest('/api/import/appointments', 'POST', { appointments });
      },
      onSuccess: (data: any) => {
        setAppointmentsCreated(data.created);
        if (data.errors && data.errors.length > 0) {
          setImportErrors(prev => [...prev, ...data.errors.map((e: any) => e.error)]);
        }
        setTimeout(() => setCurrentPhase('reminders'), 500);
      },
      onError: (error: any) => {
        setImportErrors(prev => [...prev, 'Failed to create appointments: ' + error.message]);
        setCurrentPhase('complete');
      },
    });

    const importRemindersMutation = useMutation({
      mutationFn: async (reminders: any[]) => {
        return apiRequest('/api/import/reminders', 'POST', { reminders });
      },
      onSuccess: (data: any) => {
        setRemindersScheduled(data.scheduled);
        if (data.errors && data.errors.length > 0) {
          setImportErrors(prev => [...prev, ...data.errors.map((e: any) => e.error)]);
        }
        setTimeout(() => setCurrentPhase('complete'), 500);
      },
      onError: (error: any) => {
        setImportErrors(prev => [...prev, 'Failed to schedule reminders: ' + error.message]);
        setCurrentPhase('complete');
      },
    });

    // Start import process when component mounts
    useEffect(() => {
      if (currentPhase === 'contacts' && !importContactsMutation.isPending && contactsImported === 0) {
        const contactsToImport = appointmentData.map(contact => ({
          name: contact.name,
          phone: contact.phone,
          email: contact.email,
          appointmentTime: contact.appointmentDate && contact.appointmentTime ? 
            `${contact.appointmentDate} ${contact.appointmentTime}` : undefined,
          appointmentType: contact.appointmentType,
          appointmentDuration: contact.duration ? parseInt(contact.duration) : undefined,
          specialInstructions: contact.specialInstructions,
          notes: contact.notes,
          priorityLevel: 'normal' as const,
          preferredContactMethod: 'voice' as const,
        }));

        importContactsMutation.mutate(contactsToImport);
      }
    }, [currentPhase]);

    useEffect(() => {
      if (currentPhase === 'appointments' && !importAppointmentsMutation.isPending && appointmentsCreated === 0 && upcomingAppointments.length > 0 && createdContactIds.length > 0) {
        // Create appointments using real contact IDs returned from import
        const appointmentsToCreate = upcomingAppointments.slice(0, createdContactIds.length).map((contact, index) => ({
          contactId: createdContactIds[index],
          appointmentTime: `${contact.appointmentDate} ${contact.appointmentTime}`,
          appointmentType: contact.appointmentType,
          appointmentDuration: contact.appointmentDuration || 60,
          calendarProvider: settingsData.calendarProvider || 'cal.com' as const,
          eventTypeId: settingsData.eventTypeId || 'default',
        }));

        importAppointmentsMutation.mutate(appointmentsToCreate);
      } else if (currentPhase === 'appointments' && upcomingAppointments.length === 0) {
        // Skip appointment creation if no appointments
        setTimeout(() => setCurrentPhase('reminders'), 500);
      }
    }, [currentPhase, createdContactIds]);

    useEffect(() => {
      if (currentPhase === 'reminders' && !importRemindersMutation.isPending && remindersScheduled === 0 && upcomingAppointments.length > 0 && createdContactIds.length > 0) {
        const remindersToSchedule = upcomingAppointments.slice(0, createdContactIds.length).map((contact, index) => {
          const appointmentDateTime = new Date(`${contact.appointmentDate} ${contact.appointmentTime}`);
          const reminderTime = new Date(appointmentDateTime.getTime() - (settingsData.reminderMinutes || 24 * 60) * 60 * 1000);
          
          return {
            contactId: createdContactIds[index], // Use actual contact IDs
            reminderTime: reminderTime.toISOString(),
            callBeforeHours: Math.round((settingsData.reminderMinutes || 24 * 60) / 60),
            voiceSettings: settingsData.voiceSettings,
          };
        });

        importRemindersMutation.mutate(remindersToSchedule);
      } else if (currentPhase === 'reminders' && upcomingAppointments.length === 0) {
        // Skip reminder scheduling if no appointments
        setTimeout(() => setCurrentPhase('complete'), 500);
      }
    }, [currentPhase, createdContactIds]);

    return (
      <TooltipProvider>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h3 className="text-lg font-semibold">Import Progress & Appointment Scheduling</h3>
            <p className="text-sm text-muted-foreground">
              Creating contacts and scheduling appointments from your CSV data
            </p>
          </div>

          {/* Overall Progress */}
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Overall Progress</span>
                  <span className="font-medium">{Math.round(overallProgress)}%</span>
                </div>
                <Progress value={overallProgress} className="w-full" data-testid="overall-progress" />
              </div>
            </CardContent>
          </Card>

          {/* Phase Progress Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card className={currentPhase === 'contacts' ? 'border-blue-500 bg-blue-50' : contactsImported === totalContacts ? 'border-green-500 bg-green-50' : ''}>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    {currentPhase === 'contacts' ? (
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    ) : contactsImported === totalContacts ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Users className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="ml-2 text-sm font-medium">Contacts</span>
                  </div>
                  <div className={`text-2xl font-bold ${currentPhase === 'contacts' ? 'text-blue-600' : contactsImported === totalContacts ? 'text-green-600' : 'text-gray-400'}`} data-testid="contacts-imported-count">
                    {contactsImported}
                  </div>
                  <div className="text-xs text-muted-foreground">of {totalContacts} imported</div>
                  {currentPhase === 'contacts' && (
                    <Progress value={(contactsImported / totalContacts) * 100} className="mt-2 h-1" />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className={currentPhase === 'appointments' ? 'border-orange-500 bg-orange-50' : appointmentsCreated === upcomingAppointments.length ? 'border-green-500 bg-green-50' : ''}>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    {currentPhase === 'appointments' ? (
                      <Loader2 className="w-4 h-4 text-orange-600 animate-spin" />
                    ) : appointmentsCreated === upcomingAppointments.length ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Calendar className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="ml-2 text-sm font-medium">Appointments</span>
                  </div>
                  <div className={`text-2xl font-bold ${currentPhase === 'appointments' ? 'text-orange-600' : appointmentsCreated === upcomingAppointments.length ? 'text-green-600' : 'text-gray-400'}`} data-testid="appointments-created-count">
                    {appointmentsCreated}
                  </div>
                  <div className="text-xs text-muted-foreground">of {upcomingAppointments.length} scheduled</div>
                  {currentPhase === 'appointments' && upcomingAppointments.length > 0 && (
                    <Progress value={(appointmentsCreated / upcomingAppointments.length) * 100} className="mt-2 h-1" />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className={currentPhase === 'reminders' ? 'border-purple-500 bg-purple-50' : remindersScheduled === upcomingAppointments.length ? 'border-green-500 bg-green-50' : ''}>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    {currentPhase === 'reminders' ? (
                      <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                    ) : remindersScheduled === upcomingAppointments.length ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Phone className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="ml-2 text-sm font-medium">Reminders</span>
                  </div>
                  <div className={`text-2xl font-bold ${currentPhase === 'reminders' ? 'text-purple-600' : remindersScheduled === upcomingAppointments.length ? 'text-green-600' : 'text-gray-400'}`} data-testid="reminders-scheduled-count">
                    {remindersScheduled}
                  </div>
                  <div className="text-xs text-muted-foreground">of {upcomingAppointments.length} scheduled</div>
                  {currentPhase === 'reminders' && upcomingAppointments.length > 0 && (
                    <Progress value={(remindersScheduled / upcomingAppointments.length) * 100} className="mt-2 h-1" />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Current Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Current Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {currentPhase === 'contacts' && (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    <span className="text-sm">Importing contact data...</span>
                  </div>
                )}
                {currentPhase === 'appointments' && (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-orange-600 animate-spin" />
                    <span className="text-sm">Creating appointment records and syncing to calendar...</span>
                  </div>
                )}
                {currentPhase === 'reminders' && (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                    <span className="text-sm">Scheduling voice reminder calls...</span>
                  </div>
                )}
                {currentPhase === 'complete' && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium">Import completed successfully!</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Success Summary */}
          {currentPhase === 'complete' && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">Import Completed Successfully!</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">✅ {contactsImported} contacts imported</span>
                    </div>
                    <div>
                      <span className="font-medium">📅 {appointmentsCreated} appointments scheduled</span>
                    </div>
                    <div>
                      <span className="font-medium">📞 {remindersScheduled} voice reminders set up</span>
                    </div>
                    <div>
                      <span className="font-medium">⚡ Ready for appointment management</span>
                    </div>
                  </div>

                  <div className="text-xs text-green-700 mt-3">
                    Your contacts and appointments have been successfully imported. Voice reminders will be automatically sent based on your configured timing.
                    You can now manage these appointments from the Appointments page.
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Messages */}
          {importErrors.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-base text-red-800">Import Issues</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {importErrors.map((error, index) => (
                    <div key={index} className="text-sm text-red-700">
                      ⚠ {error}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </TooltipProvider>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto" data-testid="csv-upload-wizard">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            CSV Import Wizard
          </DialogTitle>
          <DialogDescription>
            Import contacts with appointments and group assignments
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between py-4 border-b">
          {WIZARD_STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-medium ${
                currentStep === step.id 
                  ? 'border-primary bg-primary text-primary-foreground' 
                  : currentStep > step.id
                  ? 'border-green-500 bg-green-500 text-white'
                  : 'border-muted-foreground text-muted-foreground'
              }`}>
                {currentStep > step.id ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  step.id
                )}
              </div>
              {index < WIZARD_STEPS.length - 1 && (
                <div className={`w-12 h-0.5 mx-2 ${
                  currentStep > step.id ? 'bg-green-500' : 'bg-muted-foreground/25'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Current Step Info */}
        <div className="py-2">
          <h2 className="text-xl font-semibold">{WIZARD_STEPS[currentStep - 1].title}</h2>
          <p className="text-muted-foreground">{WIZARD_STEPS[currentStep - 1].description}</p>
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={goToPreviousStep}
            disabled={currentStep === 1}
            data-testid="wizard-previous-button"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          
          <div className="text-sm text-muted-foreground">
            Step {currentStep} of {WIZARD_STEPS.length}
          </div>
          
          <Button 
            onClick={goToNextStep}
            disabled={
              currentStep === WIZARD_STEPS.length || 
              (currentStep === 1 && !csvFile) ||
              (currentStep === 2 && fieldMappings.filter(m => m.required && m.contactField).length < businessConfig.requiredFields.length) ||
              (currentStep === 3 && (
                validationErrors.filter(e => e.severity === 'error').length > 0 ||
                (businessType === 'medical' && validationErrors.filter(e => e.phiType === 'direct').length > 0)
              ))
            }
            data-testid="wizard-next-button"
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}