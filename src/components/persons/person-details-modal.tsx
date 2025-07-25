"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Dialog, 
  Tabs, 
  Card, 
  Flex, 
  Text, 
  Heading,
  Badge,
  Table,
  Button,
  IconButton
} from "@radix-ui/themes";
import { 
  PersonIcon,
  EnvelopeClosedIcon,
  MobileIcon,
  HomeIcon,
  FileIcon,
  LinkBreak2Icon,
  UploadIcon,
  TrashIcon
} from "@radix-ui/react-icons";

interface PersonDetailsModalProps {
  person: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

interface PersonDocument {
  id: string;
  document_name: string;
  document_url: string;
  document_type: string | null;
  file_size: number | null;
  uploaded_at: string;
}

interface Investment {
  id: string;
  name: string;
  ownership_percentage: number | null;
  role: string | null;
}

interface Property {
  id: string;
  name: string;
  type: string;
  city: string | null;
  country: string;
}

interface Contract {
  id: string;
  name: string;
  contract_type: string;
  provider_name: string | null;
  monthly_amount: number | null;
}

interface Relationship {
  id: string;
  related_person: {
    id: string;
    name: string;
    type: string;
  };
  relationship_type: string;
  is_active: boolean;
}

export function PersonDetailsModal({ 
  person, 
  open, 
  onOpenChange,
  onUpdate 
}: PersonDetailsModalProps) {
  const [documents, setDocuments] = useState<PersonDocument[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (open && person) {
      fetchData();
    }
  }, [open, person]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchDocuments(),
        fetchInvestments(),
        fetchProperties(),
        fetchContracts(),
        fetchRelationships()
      ]);
    } catch (error) {
      console.error("Error fetching person data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    const { data, error } = await supabase
      .from("person_documents")
      .select("*")
      .eq("person_id", person.id)
      .order("uploaded_at", { ascending: false });

    if (!error) setDocuments(data || []);
  };

  const fetchInvestments = async () => {
    const { data, error } = await supabase
      .from("investment_owners")
      .select(`
        investment:investments(id, name),
        ownership_percentage,
        role
      `)
      .eq("person_id", person.id);

    if (!error && data) {
      const formattedData = data.map((item: any) => ({
        id: item.investment?.id,
        name: item.investment?.name,
        ownership_percentage: item.ownership_percentage,
        role: item.role
      })).filter((item: any) => item.id);
      setInvestments(formattedData);
    }
  };

  const fetchProperties = async () => {
    const { data, error } = await supabase
      .from("properties")
      .select("id, name, type, city, country")
      .eq("owner_person_id", person.id);

    if (!error) setProperties(data || []);
  };

  const fetchContracts = async () => {
    const { data, error } = await supabase
      .from("contracts")
      .select("id, name, contract_type, provider_name, monthly_amount")
      .eq("person_id", person.id);

    if (!error) setContracts(data || []);
  };

  const fetchRelationships = async () => {
    const { data, error } = await supabase
      .from("person_relationships")
      .select(`
        id,
        relationship_type,
        is_active,
        related_person:related_person_id(id, name, type)
      `)
      .eq("person_id", person.id);

    if (!error && data) setRelationships(data as any);
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDocument(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Upload to Supabase Storage
      const fileName = `${user.id}/${person.id}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("person-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("person-documents")
        .getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await supabase
        .from("person_documents")
        .insert({
          person_id: person.id,
          document_name: file.name,
          document_url: publicUrl,
          file_size: file.size,
          user_id: user.id
        });

      if (dbError) throw dbError;

      fetchDocuments();
    } catch (error) {
      console.error("Error uploading document:", error);
      alert("Failed to upload document");
    } finally {
      setUploadingDocument(false);
    }
  };

  const deleteDocument = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      const { error } = await supabase
        .from("person_documents")
        .delete()
        .eq("id", docId);

      if (error) throw error;

      fetchDocuments();
    } catch (error) {
      console.error("Error deleting document:", error);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "N/A";
    const kb = bytes / 1024;
    const mb = kb / 1024;
    if (mb > 1) return `${mb.toFixed(2)} MB`;
    return `${kb.toFixed(2)} KB`;
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 900 }}>
        <Dialog.Title>
          <Flex justify="between" align="center">
            <Flex align="center" gap="3">
              <PersonIcon width="24" height="24" />
              <Heading size="6">{person.name}</Heading>
              <Badge color={person.type === "individual" ? "blue" : "green"}>
                {person.type}
              </Badge>
            </Flex>
          </Flex>
        </Dialog.Title>

        <Tabs.Root defaultValue="overview">
          <Tabs.List>
            <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
            <Tabs.Trigger value="connections">Connections</Tabs.Trigger>
            <Tabs.Trigger value="documents">Documents ({documents.length})</Tabs.Trigger>
            <Tabs.Trigger value="relationships">Relationships ({relationships.length})</Tabs.Trigger>
          </Tabs.List>

          <div className="mt-4">
            <Tabs.Content value="overview">
              <Flex direction="column" gap="4">
                <Card>
                  <Heading size="3" mb="3">Contact Information</Heading>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      {person.email && (
                        <Flex align="center" gap="2" mb="2">
                          <EnvelopeClosedIcon />
                          <Text>{person.email}</Text>
                        </Flex>
                      )}
                      {person.phone && (
                        <Flex align="center" gap="2">
                          <MobileIcon />
                          <Text>{person.phone}</Text>
                        </Flex>
                      )}
                    </div>
                    <div>
                      {person.company_name && (
                        <div className="mb-2">
                          <Text size="2" color="gray">Company</Text>
                          <Text size="3">{person.company_name}</Text>
                        </div>
                      )}
                      {person.position && (
                        <div>
                          <Text size="2" color="gray">Position</Text>
                          <Text size="3">{person.position}</Text>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                {(person.address || person.city || person.country) && (
                  <Card>
                    <Heading size="3" mb="3">Address</Heading>
                    <Flex align="start" gap="2">
                      <HomeIcon />
                      <div>
                        {person.address && <Text style={{ display: 'block' }}>{person.address}</Text>}
                        <Text>
                          {person.city && `${person.city}, `}
                          {person.state_province && `${person.state_province}, `}
                          {person.country}
                          {person.postal_code && ` ${person.postal_code}`}
                        </Text>
                      </div>
                    </Flex>
                  </Card>
                )}

                {(person.tax_id || person.date_of_birth || person.nationality) && (
                  <Card>
                    <Heading size="3" mb="3">Additional Information</Heading>
                    <div className="grid grid-cols-3 gap-4">
                      {person.tax_id && (
                        <div>
                          <Text size="2" color="gray">Tax ID</Text>
                          <Text size="3">{person.tax_id}</Text>
                        </div>
                      )}
                      {person.date_of_birth && (
                        <div>
                          <Text size="2" color="gray">Date of Birth</Text>
                          <Text size="3">{formatDate(person.date_of_birth)}</Text>
                        </div>
                      )}
                      {person.nationality && (
                        <div>
                          <Text size="2" color="gray">Nationality</Text>
                          <Text size="3">{person.nationality}</Text>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {person.notes && (
                  <Card>
                    <Heading size="3" mb="3">Notes</Heading>
                    <Text>{person.notes}</Text>
                  </Card>
                )}
              </Flex>
            </Tabs.Content>

            <Tabs.Content value="connections">
              <Flex direction="column" gap="4">
                {investments.length > 0 && (
                  <div>
                    <Heading size="4" mb="3">Investments ({investments.length})</Heading>
                    <div className="space-y-2">
                      {investments.map((inv) => (
                        <Card key={inv.id}>
                          <Flex justify="between" align="center">
                            <div>
                              <Text weight="bold">{inv.name}</Text>
                              {inv.role && <Text size="2" color="gray">{inv.role}</Text>}
                            </div>
                            {inv.ownership_percentage && (
                              <Badge>{inv.ownership_percentage}%</Badge>
                            )}
                          </Flex>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {properties.length > 0 && (
                  <div>
                    <Heading size="4" mb="3">Properties ({properties.length})</Heading>
                    <div className="space-y-2">
                      {properties.map((prop) => (
                        <Card key={prop.id}>
                          <Flex justify="between" align="center">
                            <div>
                              <Text weight="bold">{prop.name}</Text>
                              <Text size="2" color="gray">
                                {prop.city && `${prop.city}, `}{prop.country}
                              </Text>
                            </div>
                            <Badge color={prop.type === "owned" ? "green" : "blue"}>
                              {prop.type}
                            </Badge>
                          </Flex>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {contracts.length > 0 && (
                  <div>
                    <Heading size="4" mb="3">Contracts ({contracts.length})</Heading>
                    <div className="space-y-2">
                      {contracts.map((contract) => (
                        <Card key={contract.id}>
                          <Flex justify="between" align="center">
                            <div>
                              <Text weight="bold">{contract.name}</Text>
                              <Text size="2" color="gray">{contract.provider_name}</Text>
                            </div>
                            <Flex align="center" gap="3">
                              <Badge variant="outline">{contract.contract_type}</Badge>
                              {contract.monthly_amount && (
                                <Text size="2">{formatCurrency(contract.monthly_amount)}/mo</Text>
                              )}
                            </Flex>
                          </Flex>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {investments.length === 0 && properties.length === 0 && contracts.length === 0 && (
                  <Card>
                    <Flex direction="column" align="center" gap="3" className="py-8">
                      <LinkBreak2Icon width="48" height="48" />
                      <Text color="gray">No connections found</Text>
                    </Flex>
                  </Card>
                )}
              </Flex>
            </Tabs.Content>

            <Tabs.Content value="documents">
              <Flex direction="column" gap="4">
                <Flex justify="between" align="center">
                  <Heading size="4">Documents</Heading>
                  <label>
                    <input
                      type="file"
                      onChange={handleDocumentUpload}
                      style={{ display: "none" }}
                      disabled={uploadingDocument}
                    />
                    <Button disabled={uploadingDocument}>
                      <UploadIcon />
                      {uploadingDocument ? "Uploading..." : "Upload Document"}
                    </Button>
                  </label>
                </Flex>

                {documents.length === 0 ? (
                  <Card>
                    <Flex direction="column" align="center" gap="3" className="py-8">
                      <FileIcon width="48" height="48" />
                      <Text color="gray">No documents uploaded yet</Text>
                    </Flex>
                  </Card>
                ) : (
                  <Table.Root>
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeaderCell>Document Name</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Size</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Uploaded</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {documents.map((doc) => (
                        <Table.Row key={doc.id}>
                          <Table.Cell>
                            <Flex align="center" gap="2">
                              <FileIcon />
                              <Text>{doc.document_name}</Text>
                            </Flex>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge variant="soft">{doc.document_type || "Other"}</Badge>
                          </Table.Cell>
                          <Table.Cell>{formatFileSize(doc.file_size)}</Table.Cell>
                          <Table.Cell>{formatDate(doc.uploaded_at)}</Table.Cell>
                          <Table.Cell>
                            <Flex gap="2">
                              <a
                                href={doc.document_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                download
                              >
                                <Button size="1" variant="soft">
                                  Download
                                </Button>
                              </a>
                              <Button
                                size="1"
                                variant="soft"
                                color="red"
                                onClick={() => deleteDocument(doc.id)}
                              >
                                Delete
                              </Button>
                            </Flex>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                )}
              </Flex>
            </Tabs.Content>

            <Tabs.Content value="relationships">
              <Flex direction="column" gap="4">
                <Heading size="4">Relationships</Heading>
                {relationships.length === 0 ? (
                  <Card>
                    <Flex direction="column" align="center" gap="3" className="py-8">
                      <PersonIcon width="48" height="48" />
                      <Text color="gray">No relationships defined</Text>
                    </Flex>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {relationships.map((rel) => (
                      <Card key={rel.id}>
                        <Flex justify="between" align="center">
                          <div>
                            <Text weight="bold">{rel.related_person?.name}</Text>
                            <Text size="2" color="gray">{rel.relationship_type}</Text>
                          </div>
                          <Flex gap="2">
                            <Badge color={rel.related_person?.type === "individual" ? "blue" : "green"}>
                              {rel.related_person?.type}
                            </Badge>
                            {!rel.is_active && (
                              <Badge color="gray">Inactive</Badge>
                            )}
                          </Flex>
                        </Flex>
                      </Card>
                    ))}
                  </div>
                )}
              </Flex>
            </Tabs.Content>
          </div>
        </Tabs.Root>

        <Flex gap="3" justify="end" mt="6">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Close
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}