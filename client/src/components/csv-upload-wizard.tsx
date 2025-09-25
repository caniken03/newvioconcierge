import { useState, useCallback, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  Info
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
}

interface GroupAssignment {
  columnName: string;
  groupMappings: Record<string, string>; // CSV value -> Group ID
  autoCreateGroups: boolean;
  newGroups: string[];
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

// Standard contact field types
type ContactFieldType = 
  | 'name' 
  | 'phone' 
  | 'email' 
  | 'appointmentDate' 
  | 'appointmentTime' 
  | 'appointmentType' 
  | 'duration' 
  | 'specialInstructions' 
  | 'provider' 
  | 'groups'
  | 'notes'
  | 'serviceType'
  | 'partySize'
  | 'occasion'
  | 'consultationType';

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
    optionalFields: ['email', 'appointmentType', 'provider', 'specialInstructions'],
    restrictedFields: ['notes'], // HIPAA compliance
    fieldLabels: {
      name: 'Patient Name',
      phone: 'Phone Number',
      email: 'Email Address',
      appointmentDate: 'Appointment Date',
      appointmentTime: 'Appointment Time',
      appointmentType: 'Visit Type',
      provider: 'Doctor/Provider',
      specialInstructions: 'Preparation Instructions',
      duration: 'Duration',
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
    optionalFields: ['email', 'serviceType', 'provider', 'duration', 'specialInstructions'],
    fieldLabels: {
      name: 'Client Name',
      phone: 'Phone Number',
      email: 'Email Address',
      appointmentDate: 'Appointment Date',
      appointmentTime: 'Appointment Time',
      serviceType: 'Service Type',
      provider: 'Stylist',
      specialInstructions: 'Special Requests',
      appointmentType: 'Service Type',
      duration: 'Duration',
      groups: 'Groups',
      notes: 'Notes',
      partySize: 'Party Size',
      occasion: 'Occasion',
      consultationType: 'Consultation Type'
    }
  },
  restaurant: {
    requiredFields: ['name', 'phone', 'appointmentDate', 'appointmentTime'],
    optionalFields: ['email', 'partySize', 'occasion', 'specialInstructions'],
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
      provider: 'Host/Server',
      duration: 'Duration',
      groups: 'Groups',
      notes: 'Notes',
      serviceType: 'Service Type',
      consultationType: 'Consultation Type'
    }
  },
  consultant: {
    requiredFields: ['name', 'phone', 'appointmentDate', 'appointmentTime'],
    optionalFields: ['email', 'consultationType', 'provider', 'duration', 'specialInstructions'],
    fieldLabels: {
      name: 'Client Name',
      phone: 'Phone Number',
      email: 'Email Address',
      appointmentDate: 'Appointment Date',
      appointmentTime: 'Appointment Time',
      consultationType: 'Consultation Type',
      provider: 'Consultant',
      specialInstructions: 'Preparation Required',
      appointmentType: 'Consultation Type',
      duration: 'Duration',
      groups: 'Groups',
      notes: 'Notes',
      serviceType: 'Service Type',
      partySize: 'Party Size',
      occasion: 'Occasion'
    }
  },
  general: {
    requiredFields: ['name', 'phone', 'appointmentDate', 'appointmentTime'],
    optionalFields: ['email', 'appointmentType', 'duration', 'specialInstructions'],
    fieldLabels: {
      name: 'Contact Name',
      phone: 'Phone Number',
      email: 'Email Address',
      appointmentDate: 'Appointment Date',
      appointmentTime: 'Appointment Time',
      appointmentType: 'Appointment Type',
      duration: 'Duration',
      specialInstructions: 'Notes',
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
  const [groupAssignments, setGroupAssignments] = useState<GroupAssignment[]>([]);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Business type (default to general for now - will be fetched from tenant config)
  const businessType: BusinessType = 'general';
  const businessConfig = BUSINESS_FIELD_MAPPINGS[businessType];

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
        name: ['name', 'customer', 'client', 'patient', 'guest', 'contact', 'full name', 'firstname', 'lastname'],
        phone: ['phone', 'mobile', 'telephone', 'tel', 'cell', 'number', 'contact number'],
        email: ['email', 'e-mail', 'mail', 'email address'],
        appointmentDate: ['date', 'appointment date', 'appt date', 'visit date', 'reservation date'],
        appointmentTime: ['time', 'appointment time', 'appt time', 'visit time', 'reservation time'],
        appointmentType: ['type', 'service type', 'appointment type', 'visit type', 'service', 'procedure'],
        duration: ['duration', 'length', 'time duration', 'minutes', 'hours'],
        specialInstructions: ['instructions', 'notes', 'special instructions', 'comments', 'remarks', 'preparation'],
        provider: ['provider', 'doctor', 'stylist', 'consultant', 'therapist', 'professional'],
        groups: ['group', 'category', 'classification', 'type', 'department'],
        notes: ['notes', 'comments', 'remarks', 'memo'],
        serviceType: ['service', 'service type', 'treatment', 'procedure'],
        partySize: ['party', 'party size', 'guests', 'people', 'size'],
        occasion: ['occasion', 'event', 'celebration', 'reason'],
        consultationType: ['consultation', 'consultation type', 'meeting type']
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
    onClose();
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
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
            <Button variant="outline" size="sm">
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

  // Placeholder implementations for other steps
  const renderDataValidationStep = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Validate Data</h3>
      <p className="text-muted-foreground">Data validation interface will be implemented here</p>
    </div>
  );

  const renderGroupConfigurationStep = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Configure Groups</h3>
      <p className="text-muted-foreground">Group configuration interface will be implemented here</p>
    </div>
  );

  const renderImportPreviewStep = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Preview Import</h3>
      <p className="text-muted-foreground">Import preview interface will be implemented here</p>
    </div>
  );

  const renderImportProgressStep = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Import Progress</h3>
      <Progress value={importProgress} className="w-full" />
      <p className="text-muted-foreground">Import progress tracking will be implemented here</p>
    </div>
  );

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
              (currentStep === 2 && fieldMappings.filter(m => m.required && m.contactField).length < businessConfig.requiredFields.length)
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