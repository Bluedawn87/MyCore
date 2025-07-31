"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Flex, Text, Heading, Badge, DropdownMenu } from "@radix-ui/themes";
import { 
  PlusIcon, 
  ExternalLinkIcon, 
  DotsVerticalIcon, 
  Pencil1Icon, 
  TrashIcon
} from "@radix-ui/react-icons";
import { PropertyModal } from "@/components/real-estate/property-modal";
import { PropertyDetailsModal } from "@/components/real-estate/property-details-modal";

interface Property {
  id: string;
  name: string;
  type: "owned" | "leased";
  ownership_type: "personal" | "company" | "foreign_personal" | "foreign_company";
  owner_name: string | null;
  owner_company_id: string | null;
  address: string;
  city: string | null;
  state_province: string | null;
  country: string;
  postal_code: string | null;
  acquisition_date: string | null;
  acquisition_price: number | null;
  current_market_value: number | null;
  lease_start_date: string | null;
  lease_end_date: string | null;
  lease_monthly_amount: number | null;
  portal_url: string | null;
  description: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  primary_image?: PropertyImage;
  contracts_count?: number;
  upcoming_renewals?: number;
}

interface PropertyImage {
  id: string;
  image_url: string;
  caption: string | null;
  is_primary: boolean;
}


export default function RealEstatePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const { data: propertiesData, error } = await supabase
        .from("properties")
        .select(`
          *,
          primary_image:property_images(id, image_url, caption, is_primary)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Process to get primary image and counts
      const processedData = await Promise.all(
        (propertiesData || []).map(async (property) => {
          // Get primary image
          const primaryImage = property.property_images?.find((img: any) => img.is_primary) || 
                              property.property_images?.[0] || null;

          // Get contracts count
          const { count: contractsCount } = await supabase
            .from("contracts")
            .select("id", { count: "exact", head: true })
            .eq("property_id", property.id);

          // Get upcoming renewals count
          const { count: renewalsCount } = await supabase
            .from("property_renewals")
            .select("id", { count: "exact", head: true })
            .eq("property_id", property.id)
            .eq("completed", false)
            .gte("renewal_date", new Date().toISOString());

          return {
            ...property,
            primary_image: primaryImage,
            contracts_count: contractsCount || 0,
            upcoming_renewals: renewalsCount || 0
          };
        })
      );

      setProperties(processedData);
    } catch (error) {
      console.error("Error fetching properties:", error);
    } finally {
      setLoading(false);
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

  const getOwnershipBadgeColor = (type: string) => {
    switch (type) {
      case "personal": return "blue";
      case "company": return "green";
      case "foreign_personal": return "orange";
      case "foreign_company": return "purple";
      default: return "gray";
    }
  };

  const handleDeleteProperty = async (propertyId: string) => {
    if (confirm("Are you sure you want to delete this property? This will also delete all associated contracts and documents.")) {
      await supabase.from("properties").delete().eq("id", propertyId);
      fetchProperties();
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Text>Loading real estate data...</Text>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Flex justify="between" align="center">
        <Heading size="8">Real Estate</Heading>
      </Flex>

      <Flex justify="between" align="center" mb="4">
        <Button onClick={() => setIsPropertyModalOpen(true)}>
          <PlusIcon /> Add Property
        </Button>
      </Flex>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {properties.map((property) => (
                <Card 
                  key={property.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
                  onClick={() => setSelectedProperty(property)}
                >
                  {property.primary_image && (
                    <div className="h-48 w-full bg-gray-100">
                      <img 
                        src={property.primary_image.image_url} 
                        alt={property.name}
                        className="h-full w-full object-cover"
                        // eslint-disable-next-line @next/next/no-img-element
                      />
                    </div>
                  )}
                  
                  <div className="p-4">
                    <Flex direction="column" gap="3">
                      <Flex justify="between" align="start">
                        <div className="flex-1">
                          <Heading size="4">{property.name}</Heading>
                          <Text size="2" color="gray">
                            {property.city && `${property.city}, `}{property.country}
                          </Text>
                        </div>
                        <Flex gap="2" align="center">
                          <Badge color={property.type === "owned" ? "green" : "blue"}>
                            {property.type}
                          </Badge>
                          <DropdownMenu.Root>
                            <DropdownMenu.Trigger>
                              <Button variant="ghost" size="1" onClick={(e) => e.stopPropagation()}>
                                <DotsVerticalIcon />
                              </Button>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Content>
                              <DropdownMenu.Item
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingProperty(property);
                                }}
                              >
                                <Pencil1Icon />
                                Edit Property
                              </DropdownMenu.Item>
                              <DropdownMenu.Separator />
                              <DropdownMenu.Item
                                color="red"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteProperty(property.id);
                                }}
                              >
                                <TrashIcon />
                                Delete Property
                              </DropdownMenu.Item>
                            </DropdownMenu.Content>
                          </DropdownMenu.Root>
                        </Flex>
                      </Flex>

                      <Badge color={getOwnershipBadgeColor(property.ownership_type)} variant="soft">
                        {property.ownership_type.replace("_", " ")}
                        {property.owner_name && ` - ${property.owner_name}`}
                      </Badge>

                      <div className="space-y-2">
                        {property.type === "owned" ? (
                          <>
                            {property.current_market_value && (
                              <Flex justify="between">
                                <Text size="2" color="gray">Market Value:</Text>
                                <Text size="2" weight="medium">
                                  {formatCurrency(property.current_market_value)}
                                </Text>
                              </Flex>
                            )}
                            {property.acquisition_date && (
                              <Flex justify="between">
                                <Text size="2" color="gray">Acquired:</Text>
                                <Text size="2" weight="medium">
                                  {formatDate(property.acquisition_date)}
                                </Text>
                              </Flex>
                            )}
                          </>
                        ) : (
                          <>
                            {property.lease_monthly_amount && (
                              <Flex justify="between">
                                <Text size="2" color="gray">Monthly Lease:</Text>
                                <Text size="2" weight="medium">
                                  {formatCurrency(property.lease_monthly_amount)}
                                </Text>
                              </Flex>
                            )}
                            {property.lease_end_date && (
                              <Flex justify="between">
                                <Text size="2" color="gray">Lease Ends:</Text>
                                <Text size="2" weight="medium">
                                  {formatDate(property.lease_end_date)}
                                </Text>
                              </Flex>
                            )}
                          </>
                        )}
                      </div>

                      <Flex justify="between" align="center">
                        <Flex gap="3">
                          {property.contracts_count && property.contracts_count > 0 && (
                            <Badge variant="outline">
                              {property.contracts_count} contracts
                            </Badge>
                          )}
                          {property.upcoming_renewals && property.upcoming_renewals > 0 && (
                            <Badge variant="outline" color="orange">
                              {property.upcoming_renewals} renewals
                            </Badge>
                          )}
                        </Flex>
                        {property.portal_url && (
                          <a 
                            href={property.portal_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-blue-500 hover:text-blue-600"
                          >
                            <Text size="2">Portal</Text>
                            <ExternalLinkIcon />
                          </a>
                        )}
                      </Flex>
                    </Flex>
                  </div>
                </Card>
              ))}
            </div>

            {properties.length === 0 && (
              <Card>
                <Flex direction="column" align="center" gap="3" className="py-8">
                  <Text color="gray">No properties yet</Text>
                  <Button onClick={() => setIsPropertyModalOpen(true)}>
                    <PlusIcon /> Add Your First Property
                  </Button>
                </Flex>
              </Card>
            )}

      <PropertyModal
        open={isPropertyModalOpen || !!editingProperty}
        onOpenChange={(open) => {
          if (!open) {
            setIsPropertyModalOpen(false);
            setEditingProperty(null);
          } else if (!editingProperty) {
            setIsPropertyModalOpen(true);
          }
        }}
        property={editingProperty}
        onSuccess={() => {
          fetchProperties();
          setIsPropertyModalOpen(false);
          setEditingProperty(null);
        }}
      />


      {selectedProperty && (
        <PropertyDetailsModal
          property={selectedProperty}
          open={!!selectedProperty}
          onOpenChange={(open) => !open && setSelectedProperty(null)}
          onUpdate={() => {
            fetchProperties();
          }}
        />
      )}
    </div>
  );
}