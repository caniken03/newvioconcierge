import { useState, useCallback, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
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
  Loader2
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
  contactField: string;
  confidence: number;
  required: boolean;
  dataType: 'text' | 'phone' | 'email' | 'date' | 'time' | 'number';
  sampleValues: string[];
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

// Business type specific field mappings
const BUSINESS_FIELD_MAPPINGS = {
  medical: {
    requiredFields: ['name', 'phone', 'appointmentDate', 'appointmentTime'],
    optionalFields: ['email', 'appointmentType', 'provider', 'specialInstructions'],
    restrictedFields: ['notes'], // HIPAA compliance
    fieldLabels: {
      name: 'Patient Name',
      provider: 'Doctor/Provider',
      appointmentType: 'Visit Type',
      specialInstructions: 'Preparation Instructions'
    }
  },
  salon: {
    requiredFields: ['name', 'phone', 'appointmentDate', 'appointmentTime'],
    optionalFields: ['email', 'serviceType', 'stylist', 'duration', 'specialInstructions'],
    fieldLabels: {
      name: 'Client Name',
      serviceType: 'Service Type',
      provider: 'Stylist',
      specialInstructions: 'Special Requests'
    }
  },
  restaurant: {
    requiredFields: ['name', 'phone', 'appointmentDate', 'appointmentTime'],
    optionalFields: ['email', 'partySize', 'occasion', 'specialInstructions'],
    fieldLabels: {
      name: 'Guest Name',
      appointmentDate: 'Reservation Date',
      appointmentTime: 'Reservation Time',
      specialInstructions: 'Special Requests'
    }
  },
  consultant: {
    requiredFields: ['name', 'phone', 'appointmentDate', 'appointmentTime'],
    optionalFields: ['email', 'consultationType', 'consultant', 'duration', 'specialInstructions'],
    fieldLabels: {
      name: 'Client Name',
      consultationType: 'Consultation Type',
      provider: 'Consultant',
      specialInstructions: 'Preparation Required'
    }
  },
  general: {
    requiredFields: ['name', 'phone', 'appointmentDate', 'appointmentTime'],
    optionalFields: ['email', 'appointmentType', 'duration', 'specialInstructions'],
    fieldLabels: {
      name: 'Contact Name',
      appointmentType: 'Appointment Type',
      specialInstructions: 'Notes'
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
  const businessType = 'general';
  const businessConfig = BUSINESS_FIELD_MAPPINGS[businessType as keyof typeof BUSINESS_FIELD_MAPPINGS] || BUSINESS_FIELD_MAPPINGS.general;

  // Step 1: File Upload Implementation
  const handleFileUpload = useCallback(async (file: File) => {
    if (!file) return;

    setIsProcessing(true);
    try {
      // Validate file
      if (!file.name.endsWith('.csv')) {
        throw new Error('Please select a valid CSV file');
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit per PRD
        throw new Error('File size must be less than 10MB');
      }

      // Parse CSV file
      const text = await file.text();
      const lines = text.split('\n');
      
      if (lines.length > 10000) { // Row limit per PRD
        throw new Error('CSV file exceeds maximum 10,000 rows');
      }

      // Detect delimiter
      const firstLine = lines[0];
      const delimiter = detectDelimiter(firstLine);
      
      // Parse headers and rows
      const headers = firstLine.split(delimiter).map(h => h.trim().replace(/"/g, ''));
      const rows = lines.slice(1)
        .filter(line => line.trim())
        .map(line => line.split(delimiter).map(cell => cell.trim().replace(/"/g, '')));

      const csvData: CSVFile = {
        file,
        headers,
        rows,
        rowCount: rows.length,
        fileSize: file.size,
        encoding: 'UTF-8', // Detected encoding
        delimiter
      };

      setCsvFile(csvData);
      
      // Auto-generate field mappings
      const mappings = generateFieldMappings(headers, businessConfig);
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

  // Helper function to detect CSV delimiter
  const detectDelimiter = (line: string): string => {
    const delimiters = [',', ';', '\t', '|'];
    const counts = delimiters.map(d => line.split(d).length);
    const maxIndex = counts.indexOf(Math.max(...counts));
    return delimiters[maxIndex];
  };

  // Helper function to generate automatic field mappings
  const generateFieldMappings = (headers: string[], config: any): FieldMapping[] => {
    return headers.map(header => {
      const lowerHeader = header.toLowerCase();
      let contactField = '';
      let confidence = 0;
      let dataType: 'text' | 'phone' | 'email' | 'date' | 'time' | 'number' = 'text';

      // Intelligent field detection based on header names
      if (lowerHeader.includes('name') || lowerHeader.includes('customer') || lowerHeader.includes('client')) {
        contactField = 'name';
        confidence = 95;
      } else if (lowerHeader.includes('phone') || lowerHeader.includes('mobile') || lowerHeader.includes('telephone')) {
        contactField = 'phone';
        dataType = 'phone';
        confidence = 95;
      } else if (lowerHeader.includes('email')) {
        contactField = 'email';
        dataType = 'email';
        confidence = 95;
      } else if (lowerHeader.includes('date') && lowerHeader.includes('appointment')) {
        contactField = 'appointmentDate';
        dataType = 'date';
        confidence = 90;
      } else if (lowerHeader.includes('time') && lowerHeader.includes('appointment')) {
        contactField = 'appointmentTime';
        dataType = 'time';
        confidence = 90;
      } else if (lowerHeader.includes('type') || lowerHeader.includes('service')) {
        contactField = 'appointmentType';
        confidence = 70;
      } else if (lowerHeader.includes('group') || lowerHeader.includes('category')) {
        contactField = 'groups';
        confidence = 80;
      }

      return {
        csvColumn: header,
        contactField,
        confidence,
        required: config.requiredFields.includes(contactField),
        dataType,
        sampleValues: [] // Will be populated later
      };
    });
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
          Supports CSV, Excel XLSX, and TSV files (max 10MB, 10,000 rows)
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
          accept=".csv,.xlsx,.tsv"
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

  // Step 2: Field Mapping UI (placeholder)
  const renderFieldMappingStep = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Map CSV Fields</h3>
      <p className="text-muted-foreground">Field mapping interface will be implemented here</p>
      {csvFile && (
        <Card>
          <CardContent className="pt-4">
            <p>File: {csvFile.file.name}</p>
            <p>Rows: {csvFile.rowCount}</p>
            <p>Columns: {csvFile.headers.length}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );

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
            disabled={currentStep === WIZARD_STEPS.length || (currentStep === 1 && !csvFile)}
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