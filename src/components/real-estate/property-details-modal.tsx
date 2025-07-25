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
  TextField,
  TextArea,
  IconButton
} from "@radix-ui/themes";
import { 
  ExternalLinkIcon, 
  UploadIcon, 
  TrashIcon,
  CalendarIcon,
  FileIcon,
  ImageIcon,
  PlusIcon
} from "@radix-ui/react-icons";

interface PropertyDetailsModalProps {
  property: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

interface PropertyImage {
  id: string;
  image_url: string;
  caption: string | null;
  is_primary: boolean;
  display_order: number;
}

interface PropertyDocument {
  id: string;
  document_name: string;
  document_url: string;
  document_type: string | null;
  file_size: number | null;
  uploaded_at: string;
}

interface PropertyRenewal {
  id: string;
  renewal_type: string;
  renewal_date: string;
  description: string | null;
  completed: boolean;
}

interface Contract {
  id: string;
  name: string;
  contract_type: string;
  provider_name: string | null;
  monthly_amount: number | null;
  renewal_date: string | null;
  auto_renewal: boolean;
}

export function PropertyDetailsModal({ 
  property, 
  open, 
  onOpenChange,
  onUpdate 
}: PropertyDetailsModalProps) {
  const [images, setImages] = useState<PropertyImage[]>([]);
  const [documents, setDocuments] = useState<PropertyDocument[]>([]);
  const [renewals, setRenewals] = useState<PropertyRenewal[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (open && property) {
      fetchData();
    }
  }, [open, property]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchImages(),
        fetchDocuments(),
        fetchRenewals(),
        fetchContracts()
      ]);
    } catch (error) {
      console.error("Error fetching property data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchImages = async () => {
    const { data, error } = await supabase
      .from("property_images")
      .select("*")
      .eq("property_id", property.id)
      .order("display_order", { ascending: true });

    if (!error) setImages(data || []);
  };

  const fetchDocuments = async () => {
    const { data, error } = await supabase
      .from("property_documents")
      .select("*")
      .eq("property_id", property.id)
      .order("uploaded_at", { ascending: false });

    if (!error) setDocuments(data || []);
  };

  const fetchRenewals = async () => {
    const { data, error } = await supabase
      .from("property_renewals")
      .select("*")
      .eq("property_id", property.id)
      .order("renewal_date", { ascending: true });

    if (!error) setRenewals(data || []);
  };

  const fetchContracts = async () => {
    const { data, error } = await supabase
      .from("contracts")
      .select("*")
      .eq("property_id", property.id)
      .order("name", { ascending: true });

    if (!error) setContracts(data || []);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Upload to Supabase Storage
      const fileName = `${user.id}/${property.id}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("property-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("property-images")
        .getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await supabase
        .from("property_images")
        .insert({
          property_id: property.id,
          image_url: publicUrl,
          is_primary: images.length === 0,
          display_order: images.length
        });

      if (dbError) throw dbError;

      fetchImages();
      onUpdate();
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDocument(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Upload to Supabase Storage
      const fileName = `${user.id}/${property.id}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("property-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("property-documents")
        .getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await supabase
        .from("property_documents")
        .insert({
          property_id: property.id,
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

  const deleteImage = async (imageId: string, imageUrl: string) => {
    if (!confirm("Are you sure you want to delete this image?")) return;

    try {
      // Delete from database
      const { error } = await supabase
        .from("property_images")
        .delete()
        .eq("id", imageId);

      if (error) throw error;

      fetchImages();
      onUpdate();
    } catch (error) {
      console.error("Error deleting image:", error);
    }
  };

  const deleteDocument = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      const { error } = await supabase
        .from("property_documents")
        .delete()
        .eq("id", docId);

      if (error) throw error;

      fetchDocuments();
    } catch (error) {
      console.error("Error deleting document:", error);
    }
  };

  const setPrimaryImage = async (imageId: string) => {
    try {
      // Set all images to non-primary
      await supabase
        .from("property_images")
        .update({ is_primary: false })
        .eq("property_id", property.id);

      // Set selected image as primary
      await supabase
        .from("property_images")
        .update({ is_primary: true })
        .eq("id", imageId);

      fetchImages();
      onUpdate();
    } catch (error) {
      console.error("Error setting primary image:", error);
    }
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

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 1000 }}>
        <Dialog.Title>
          <Flex justify="between" align="center">
            <Flex align="center" gap="3">
              <Heading size="6">{property.name}</Heading>
              <Badge color={property.type === "owned" ? "green" : "blue"}>
                {property.type}
              </Badge>
            </Flex>
            {property.portal_url && (
              <a 
                href={property.portal_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-500 hover:text-blue-600"
              >
                <Text size="2">Portal</Text>
                <ExternalLinkIcon />
              </a>
            )}
          </Flex>
        </Dialog.Title>

        <Tabs.Root defaultValue="overview">
          <Tabs.List>
            <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
            <Tabs.Trigger value="gallery">Gallery ({images.length})</Tabs.Trigger>
            <Tabs.Trigger value="documents">Documents ({documents.length})</Tabs.Trigger>
            <Tabs.Trigger value="contracts">Contracts ({contracts.length})</Tabs.Trigger>
            <Tabs.Trigger value="renewals">Renewals ({renewals.filter(r => !r.completed).length})</Tabs.Trigger>
          </Tabs.List>

          <div className="mt-4">
            <Tabs.Content value="overview">
              <Flex direction="column" gap="4">
                <Card>
                  <Heading size="3" mb="3">Property Details</Heading>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Text size="2" color="gray">Address</Text>
                      <Text size="3">{property.address}</Text>
                      <Text size="2" color="gray">
                        {property.city && `${property.city}, `}
                        {property.state_province && `${property.state_province}, `}
                        {property.country}
                        {property.postal_code && ` ${property.postal_code}`}
                      </Text>
                    </div>
                    <div>
                      <Text size="2" color="gray">Ownership</Text>
                      <Badge color={property.ownership_type.includes("foreign") ? "orange" : "blue"}>
                        {property.ownership_type.replace("_", " ")}
                      </Badge>
                      {property.owner_name && (
                        <Text size="3" style={{ display: 'block', marginTop: '4px' }}>{property.owner_name}</Text>
                      )}
                    </div>
                  </div>
                </Card>

                {property.type === "owned" ? (
                  <Card>
                    <Heading size="3" mb="3">Financial Information</Heading>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Text size="2" color="gray">Acquisition Date</Text>
                        <Text size="4" weight="bold">{formatDate(property.acquisition_date)}</Text>
                      </div>
                      <div>
                        <Text size="2" color="gray">Acquisition Price</Text>
                        <Text size="4" weight="bold">{formatCurrency(property.acquisition_price)}</Text>
                      </div>
                      <div>
                        <Text size="2" color="gray">Current Market Value</Text>
                        <Text size="4" weight="bold">{formatCurrency(property.current_market_value)}</Text>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <Card>
                    <Heading size="3" mb="3">Lease Information</Heading>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Text size="2" color="gray">Lease Period</Text>
                        <Text size="3">
                          {formatDate(property.lease_start_date)} - {formatDate(property.lease_end_date)}
                        </Text>
                      </div>
                      <div>
                        <Text size="2" color="gray">Monthly Amount</Text>
                        <Text size="4" weight="bold">{formatCurrency(property.lease_monthly_amount)}</Text>
                      </div>
                      <div>
                        <Text size="2" color="gray">Days Remaining</Text>
                        <Text size="4" weight="bold">
                          {property.lease_end_date 
                            ? Math.max(0, Math.floor((new Date(property.lease_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
                            : "N/A"
                          }
                        </Text>
                      </div>
                    </div>
                  </Card>
                )}

                {(property.description || property.notes) && (
                  <Card>
                    <Heading size="3" mb="3">Additional Information</Heading>
                    {property.description && (
                      <div className="mb-3">
                        <Text size="2" color="gray">Description</Text>
                        <Text size="3">{property.description}</Text>
                      </div>
                    )}
                    {property.notes && (
                      <div>
                        <Text size="2" color="gray">Notes</Text>
                        <Text size="3">{property.notes}</Text>
                      </div>
                    )}
                  </Card>
                )}
              </Flex>
            </Tabs.Content>

            <Tabs.Content value="gallery">
              <Flex direction="column" gap="4">
                <Flex justify="between" align="center">
                  <Heading size="4">Property Images</Heading>
                  <label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: "none" }}
                      disabled={uploadingImage}
                    />
                    <Button disabled={uploadingImage}>
                      <UploadIcon />
                      {uploadingImage ? "Uploading..." : "Upload Image"}
                    </Button>
                  </label>
                </Flex>

                {images.length === 0 ? (
                  <Card>
                    <Flex direction="column" align="center" gap="3" className="py-8">
                      <ImageIcon width="48" height="48" />
                      <Text color="gray">No images uploaded yet</Text>
                    </Flex>
                  </Card>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {images.map((image) => (
                      <Card key={image.id} className="relative group">
                        <img 
                          src={image.image_url} 
                          alt={image.caption || property.name}
                          className="w-full h-48 object-cover rounded"
                        />
                        {image.is_primary && (
                          <Badge 
                            color="green" 
                            className="absolute top-2 left-2"
                          >
                            Primary
                          </Badge>
                        )}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                          {!image.is_primary && (
                            <IconButton
                              size="1"
                              variant="solid"
                              onClick={() => setPrimaryImage(image.id)}
                            >
                              <ImageIcon />
                            </IconButton>
                          )}
                          <IconButton
                            size="1"
                            variant="solid"
                            color="red"
                            onClick={() => deleteImage(image.id, image.image_url)}
                          >
                            <TrashIcon />
                          </IconButton>
                        </div>
                        {image.caption && (
                          <Text size="2" className="mt-2">{image.caption}</Text>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </Flex>
            </Tabs.Content>

            <Tabs.Content value="documents">
              <Flex direction="column" gap="4">
                <Flex justify="between" align="center">
                  <Heading size="4">Property Documents</Heading>
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

            <Tabs.Content value="contracts">
              {contracts.length === 0 ? (
                <Card>
                  <Flex direction="column" align="center" gap="3" className="py-8">
                    <Text color="gray">No contracts associated with this property</Text>
                  </Flex>
                </Card>
              ) : (
                <div className="space-y-3">
                  {contracts.map((contract) => (
                    <Card key={contract.id}>
                      <Flex justify="between" align="center">
                        <div>
                          <Flex align="center" gap="3">
                            <Heading size="4">{contract.name}</Heading>
                            <Badge>{contract.contract_type}</Badge>
                            {contract.auto_renewal && (
                              <Badge color="green" variant="soft">Auto-renewal</Badge>
                            )}
                          </Flex>
                          <Text size="2" color="gray">{contract.provider_name}</Text>
                          <Flex gap="4" mt="2">
                            {contract.monthly_amount && (
                              <Text size="2">
                                Monthly: <Text weight="bold">{formatCurrency(contract.monthly_amount)}</Text>
                              </Text>
                            )}
                            {contract.renewal_date && (
                              <Text size="2">
                                Renewal: <Text weight="bold">{formatDate(contract.renewal_date)}</Text>
                              </Text>
                            )}
                          </Flex>
                        </div>
                      </Flex>
                    </Card>
                  ))}
                </div>
              )}
            </Tabs.Content>

            <Tabs.Content value="renewals">
              <Flex direction="column" gap="4">
                <Heading size="4">Upcoming Renewals</Heading>
                {renewals.filter(r => !r.completed).length === 0 ? (
                  <Card>
                    <Flex direction="column" align="center" gap="3" className="py-8">
                      <CalendarIcon width="48" height="48" />
                      <Text color="gray">No upcoming renewals</Text>
                    </Flex>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {renewals.filter(r => !r.completed).map((renewal) => (
                      <Card key={renewal.id}>
                        <Flex justify="between" align="center">
                          <div>
                            <Flex align="center" gap="3">
                              <CalendarIcon />
                              <Text size="3" weight="bold">{renewal.renewal_type}</Text>
                              <Badge color="orange">{formatDate(renewal.renewal_date)}</Badge>
                            </Flex>
                            {renewal.description && (
                              <Text size="2" color="gray" mt="1">{renewal.description}</Text>
                            )}
                          </div>
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