import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Trash2, FileText, Loader2, Download } from 'lucide-react';
import { BASE_URL } from './AIRecommender/api';
import { useToast } from '@/hooks/use-toast';
import { jsPDF } from 'jspdf';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';

interface Project {
  id: string;
  projectName?: string;
  project_name?: string;
  projectDescription?: string;
  project_description?: string;
  productType?: string;
  product_type?: string;
  instrumentsCount?: number;
  instruments_count?: number;
  accessoriesCount?: number;
  accessories_count?: number;
  searchTabsCount?: number;
  search_tabs_count?: number;
  currentStep?: string;
  current_step?: string;
  activeTab?: string;
  active_tab?: string;
  projectPhase?: string;
  project_phase?: string;
  conversationsCount?: number;
  conversations_count?: number;
  hasAnalysis?: boolean;
  has_analysis?: boolean;
  schemaVersion?: string;
  schema_version?: string;
  fieldDescriptionsAvailable?: boolean;
  field_descriptions_available?: boolean;
  projectStatus?: string;
  project_status?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  requirementsPreview?: string;
  requirements_preview?: string;
  initial_requirements?: string;
  initialRequirements?: string;
  conversation_history?: any;
  conversation_histories?: any;
  conversationHistory?: any;
  conversationHistories?: any;
  analysis_results?: any;
  analysisResults?: any;
  identified_instruments?: any[];
  identifiedInstruments?: any[];
  identified_accessories?: any[];
  identifiedAccessories?: any[];
  collected_data?: any;
  collectedData?: any;
  search_tabs?: any[];
  searchTabs?: any[];
  feedback_entries?: any[];
  feedbackEntries?: any[];
}

interface ProjectListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  onProjectSelect: (projectId: string) => void;
  onProjectDelete?: (deletedProjectId: string) => void;
}

const ProjectListDialog: React.FC<ProjectListDialogProps> = ({
  open,
  onOpenChange,
  children,
  onProjectSelect,
  onProjectDelete
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/projects`, {
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch projects');
      }

      const data = await response.json();
      console.log('Received projects data:', data);
      setProjects(data.projects || []);
    } catch (error: any) {
      toast({
        title: "Failed to load projects",
        description: error.message || "Could not retrieve your projects",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (projectId: string, projectName: string) => {
    try {
      console.log(`Deleting project ${projectId} (${projectName}) from MongoDB...`);

      const response = await fetch(`${BASE_URL}/api/projects/${projectId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      console.log(`Delete response status: ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Delete failed:', errorData);
        throw new Error(errorData.error || 'Failed to delete project');
      }

      const result = await response.json();
      console.log('Delete successful:', result);

      // Remove from local state
      setProjects(prevProjects =>
        prevProjects.filter(project => project.id !== projectId)
      );

      // Notify parent component about the deletion
      if (onProjectDelete) {
        onProjectDelete(projectId);
      }

      toast({
        title: "Project Deleted",
        description: `"${projectName}" has been permanently deleted from MongoDB`,
      });

    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete project",
        variant: "destructive",
      });
    }
  };

  const handleExportProject = async (projectId: string, projectName: string) => {
    setExportingId(projectId);
    try {
      // 1. Fetch full project details
      const response = await fetch(`${BASE_URL}/api/projects/${projectId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch project details');
      }

      const data = await response.json();
      const project = data.project;

      if (!project) {
        throw new Error('Project data is empty');
      }

      // 2. Generate PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let yPos = 20;

      // Helper to add text and advance yPos
      const addText = (text: string, fontSize: number = 12, isBold: boolean = false, indent: number = 0, color: string = '#000000') => {
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        doc.setTextColor(color);

        const maxWidth = pageWidth - (margin * 2) - indent;
        const splitText = doc.splitTextToSize(text, maxWidth);

        // Check for page break
        if (yPos + (splitText.length * fontSize * 0.5) > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
        }

        doc.text(splitText, margin + indent, yPos);
        yPos += (splitText.length * fontSize * 0.5) + 2;

        // Reset color to black
        doc.setTextColor('#000000');
      };

      // Helper to print a field label and its value(s) handling nested objects/arrays
      const printFieldValue = (label: string, value: any, indent: number = 10) => {
        // Base font sizes
        const keyFontSize = 11; // match top-level key size
        const valFontSize = 11; // same size for nested values as requested

        // If value is missing, show explicit 'Not specified'
        if (value === undefined || value === null || value === "") {
          addText(`  • ${label}: Not specified`, valFontSize, false, indent);
          return;
        }

        // Arrays: join on comma
        if (Array.isArray(value)) {
          const valStr = value.length > 0 ? value.join(', ') : 'Not specified';
          addText(`  • ${label}: ${valStr}`, valFontSize, false, indent);
          return;
        }

        // Objects: print nested keys on their own indented lines with same key size
        if (typeof value === 'object') {
          addText(label, keyFontSize, true, indent - 2);
          Object.entries(value).forEach(([k, v]) => {
            const display = (v === undefined || v === null || v === "") ? 'Not specified' : (typeof v === 'object' ? JSON.stringify(v) : String(v));
            addText(`• ${k}: ${display}`, valFontSize, false, indent + 8);
          });
          return;
        }

        // Primitives
        addText(`  • ${label}: ${String(value)}`, valFontSize, false, indent);
      };

      const addSectionHeader = (title: string) => {
        yPos += 5;
        if (yPos > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
        }
        addText(title, 14, true);
        yPos += 2;
      };

      // --- Title ---
      addText(`Project : ${projectName}`, 20, true);
      yPos += 10;

      // --- Description ---
      const description = project.projectDescription || project.project_description;
      if (description) {
        addSectionHeader("Description");
        addText(description, 11);
      }

      // --- Initial Requirements ---
      const initialRequirements = project.initialRequirements || project.initial_requirements;
      if (initialRequirements) {
        addSectionHeader("Initial Requirements");
        addText(initialRequirements, 11);
      }

      // --- Identified Instruments ---
      const identifiedInstruments = project.identifiedInstruments || project.identified_instruments;
      if (identifiedInstruments && identifiedInstruments.length > 0) {
        addSectionHeader("Identified Instruments");
        identifiedInstruments.forEach((inst: any, index: number) => {
          const category = inst.category || 'Unknown Category';
          const name = inst.productName || inst.product_name || 'Unknown Name';
          const quantity = inst.quantity ? ` (Qty: ${inst.quantity})` : '';

          addText(`${index + 1}. ${category}${quantity} - ${name}`, 11, true, 5);

          if (inst.specifications && Object.keys(inst.specifications).length > 0) {
            addText('Specifications:', 10, true, 10);
            Object.entries(inst.specifications).forEach(([key, val]) => {
              addText(`• ${key}: ${val}`, 10, false, 15);
            });
          }
          yPos += 2;
        });
      }

      // --- Identified Accessories ---
      const identifiedAccessories = project.identifiedAccessories || project.identified_accessories;
      if (identifiedAccessories && identifiedAccessories.length > 0) {
        addSectionHeader("Identified Accessories");
        identifiedAccessories.forEach((acc: any, index: number) => {
          const category = acc.category || 'Unknown Category';
          const name = acc.accessoryName || acc.accessory_name || 'Unknown Name';
          const quantity = acc.quantity ? ` (Qty: ${acc.quantity})` : '';

          addText(`${index + 1}. ${category}${quantity} - ${name}`, 11, true, 5);

          if (acc.specifications && Object.keys(acc.specifications).length > 0) {
            addText('Specifications:', 10, true, 10);
            Object.entries(acc.specifications).forEach(([key, val]) => {
              addText(`• ${key}: ${val}`, 10, false, 15);
            });
          }
          yPos += 2;
        });
      }

      // --- Tabs Data (Collected Data, History, Analysis) ---
      const searchTabs = project.searchTabs || project.search_tabs || [];
      const conversationHistories = project.conversationHistories || project.conversation_histories || project.conversationHistory || project.conversation_history || {};
      const collectedDataMap = project.collectedData || project.collected_data || {};
      const analysisResultsMap = project.analysisResults || project.analysis_results || {};

      // Normalize history to map
      let historyMap: { [key: string]: any } = {};
      if (conversationHistories.messages && Array.isArray(conversationHistories.messages)) {
        historyMap['default'] = conversationHistories;
      } else {
        historyMap = conversationHistories;
      }

      const tabsToExport = [...searchTabs];
      // If we have a 'default' history but it's not in searchTabs, add it
      if (historyMap['default'] && !tabsToExport.find(t => t.id === 'default')) {
        tabsToExport.push({ id: 'default', title: 'Main Chat' });
      }

      if (tabsToExport.length > 0) {
        tabsToExport.forEach((tab: any) => {
          const tabId = tab.id;
          const tabTitle = tab.title || tabId;

          // Check if this tab has ANY data to show
          const hasCollected = collectedDataMap[tabId] && Object.keys(collectedDataMap[tabId]).length > 0;
          const hasHistory = historyMap[tabId] && historyMap[tabId].messages && historyMap[tabId].messages.length > 0;
          const hasAnalysis = analysisResultsMap[tabId];

          if (!hasCollected && !hasHistory && !hasAnalysis) return;

          addSectionHeader(`Tab: ${tabTitle}`);

          // 1. Collected Data (Categorized)
          if (hasCollected) {
            addText("Collected Data:", 12, true, 5);
            const data = collectedDataMap[tabId];

            // Try to get schema from history
            const schema = historyMap[tabId]?.requirementSchema;

            if (schema && (schema.mandatory_requirements || schema.optional_requirements)) {
              // Helper to process a requirement group
              const processGroup = (groupName: string, requirements: any) => {
                if (!requirements) return;

                Object.entries(requirements).forEach(([category, fields]: [string, any]) => {
                  // Check if any field in this category has data
                  const fieldKeys = Object.keys(fields);
                  const fieldsWithData = fieldKeys.filter(key => {
                    const value = data[key];
                    return value !== undefined && value !== null && value !== "";
                  });

                  // For mandatory, also check if we need to show missing fields
                  const hasMissingMandatory = groupName === 'Mandatory' && fieldKeys.some(key => {
                    const value = data[key];
                    return value === undefined || value === null || value === "";
                  });

                  // Only show category if it has data OR has missing mandatory fields
                  if (fieldsWithData.length > 0 || hasMissingMandatory) {
                    addText(category, 11, true, 8);

                    fieldKeys.forEach(key => {
                      const value = data[key];
                        // Skip empty optional fields entirely
                        if (groupName !== 'Mandatory' && (value === undefined || value === null || value === "")) {
                          return;
                        }

                        // Format label: convert camelCase to Title Case with proper spacing
                        const label = key
                          .replace(/([A-Z])/g, ' $1')
                          .replace(/^./, str => str.toUpperCase())
                          .trim();

                        // Use helper to print value (handles nested objects/arrays and missing values)
                        printFieldValue(label, value, 10);
                    });

                    yPos += 2;
                  }
                });
              };

              if (schema.mandatory_requirements) {
                processGroup('Mandatory', schema.mandatory_requirements);
              }

              if (schema.optional_requirements) {
                processGroup('Optional', schema.optional_requirements);
              }

              // Handle "Other" data not in schema
              const schemaFields = new Set<string>();
              const collectFields = (reqs: any) => {
                if (!reqs) return;
                Object.values(reqs).forEach((cat: any) => {
                  Object.keys(cat).forEach(k => schemaFields.add(k));
                });
              };
              collectFields(schema.mandatory_requirements);
              collectFields(schema.optional_requirements);

              const otherKeys = Object.keys(data).filter(k => !schemaFields.has(k));
              if (otherKeys.length > 0) {
                addText("Other Data", 11, true, 8);
                otherKeys.forEach(key => {
                  const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                  const value = data[key];
                  printFieldValue(label, value, 10);
                });
              }

            } else {
              // Fallback for no schema: simple list
              Object.entries(data).forEach(([key, value]) => {
                // Skip empty values
                if (value === undefined || value === null || value === "") return;

                const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
                printFieldValue(label, value, 10);
              });
            }
            yPos += 3;
          }

          // 2. Conversation History
          if (hasHistory) {
            addText("Conversation History:", 12, true, 5);
            const messages = historyMap[tabId].messages;
            messages.forEach((msg: any) => {
              const role = (msg.type === 'human' || msg.type === 'user') ? 'User' : 'AI';
              const content = msg.content || '';
              addText(`${role}:`, 11, true, 10);
              addText(content, 10, false, 15);
              yPos += 2;
            });
            yPos += 3;
          }

          // 3. Analysis Results
          if (hasAnalysis) {
            addText("Analysis Results:", 12, true, 5);
            const result = analysisResultsMap[tabId];

            if (result.summary) {
              addText("Summary:", 11, true, 10);
              addText(result.summary, 10, false, 15);
              yPos += 2;
            }

            if (result.overallRanking?.rankedProducts?.length > 0) {
              addText("Ranked Products:", 11, true, 10);
              result.overallRanking.rankedProducts.forEach((product: any, idx: number) => {
                const pName = product.productName || product.product_name || product.name || 'Unknown Product';
                const vendor = product.vendor || product.vendorName || product.vendor_name || 'Unknown Vendor';

                yPos += 2;
                addText(`${idx + 1}. ${pName} (${vendor})`, 11, true, 15);

                if (product.description) {
                  addText(`Description: ${product.description}`, 10, false, 20);
                }

                // Price
                const price = product.price || product.pricing;
                if (price) {
                  let priceStr = '';
                  let priceUrl = '';
                  if (typeof price === 'object') {
                    priceStr = price.amount ? `${price.amount} ${price.currency || ''}` : (price.price || '');
                    priceUrl = price.url || price.productUrl || '';
                  } else {
                    priceStr = String(price);
                  }

                  if (priceStr) addText(`Price: ${priceStr}`, 10, false, 20);
                  if (priceUrl) addText(`Price URL: ${priceUrl}`, 10, false, 20);
                }

                // Image
                const topImage = product.topImage || product.top_image || product.topImageUrl || product.top_image_url;
                if (topImage) {
                  const url = typeof topImage === 'string' ? topImage : (topImage.url || topImage.src);
                  if (url) addText(`Image URL: ${url}`, 10, false, 20);
                }

                // Specs
                if (product.specifications && Object.keys(product.specifications).length > 0) {
                  addText("Specifications:", 10, true, 20);
                  Object.entries(product.specifications).forEach(([k, v]) => {
                    addText(`- ${k}: ${v}`, 10, false, 25);
                  });
                }
              });
            }
            yPos += 3;
          }
        });
      }

      // --- Feedback ---
      const feedbackEntries = project.feedback_entries || (project as any).feedbackEntries;
      if (feedbackEntries && Array.isArray(feedbackEntries) && feedbackEntries.length > 0) {
        addSectionHeader("User Feedback");
        feedbackEntries.forEach((entry: any, idx: number) => {
          const type = entry.type || 'General';
          const content = entry.content || entry.feedback || '';
          const date = entry.timestamp || entry.created_at || '';

          addText(`${idx + 1}. [${type}] ${date ? `(${new Date(date).toLocaleDateString()})` : ''}`, 11, true, 5);
          addText(content, 10, false, 8);
          yPos += 2;
        });
      }

      // Save PDF
      doc.save(`${projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.pdf`);

      toast({
        title: "Export Successful",
        description: "Project exported to PDF successfully.",
      });

    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export project",
        variant: "destructive",
      });
    } finally {
      setExportingId(null);
    }
  };

  const handleProjectOpen = async (projectId: string) => {
    onOpenChange(false);
    onProjectSelect(projectId);
  };

  // Fetch projects when dialog opens
  useEffect(() => {
    if (open) {
      fetchProjects();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Open Project</DialogTitle>
          <DialogDescription className="sr-only">Select a project from the list to open it.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading projects...</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No saved projects found</p>
              <p className="text-sm">Create your first project by working on requirements and clicking Save</p>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((project) => (
                <Card key={project.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1">{project.projectName || project.project_name}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleProjectOpen(project.id)}
                          className="btn-primary"
                        >
                          Open
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Project</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{project.projectName || project.project_name}"?
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteProject(project.id, project.projectName || project.project_name || 'Project')}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={exportingId === project.id}
                            >
                              {exportingId === project.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Export Project</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to export "{project.projectName || project.project_name}" to PDF?
                                This will download a document containing the full project history and details.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleExportProject(project.id, project.projectName || project.project_name || 'Project')}
                              >
                                Yes, Export
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectListDialog;
