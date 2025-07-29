"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  Flex,
  Text,
  Heading,
  Badge,
  Button,
  Table,
  Tabs,
  Separator,
  Card
} from "@radix-ui/themes";
import {
  CalendarIcon,
  PersonIcon,
  ComponentInstanceIcon,
  FileTextIcon,
  GearIcon,
  HomeIcon,
  ExternalLinkIcon,
  Pencil1Icon
} from "@radix-ui/react-icons";

interface AssetDetailsModalProps {
  asset: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onAddMaintenance: () => void;
}

export function AssetDetailsModal({ asset, open, onOpenChange, onEdit, onAddMaintenance }: AssetDetailsModalProps) {
  const [contracts, setContracts] = useState<any[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (open && asset) {
      fetchAssetDetails();
    }
  }, [open, asset]);

  const fetchAssetDetails = async () => {
    try {
      const [contractsResult, maintenanceResult] = await Promise.all([
        supabase
          .from("contracts")
          .select("*")
          .eq("asset_id", asset.id)
          .order("renewal_date", { ascending: true }),
        supabase
          .from("maintenance_logs")
          .select("*")
          .eq("asset_id", asset.id)
          .order("maintenance_date", { ascending: false })
      ]);

      if (contractsResult.data) setContracts(contractsResult.data);
      if (maintenanceResult.data) setMaintenanceLogs(maintenanceResult.data);
    } catch (error) {
      console.error("Error fetching asset details:", error);
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

  const getAssetIcon = (type: string) => {
    switch (type) {
      case "car": return "🚗";
      case "motorbike": return "🏍️";
      case "boat": return "🚤";
      case "equipment": return "📹";
      case "aircon": return "❄️";
      default: return "📦";
    }
  };

  const getDaysUntilRenewal = (renewalDate: string | null) => {
    if (!renewalDate) return null;
    const today = new Date();
    const renewal = new Date(renewalDate);
    const diffTime = renewal.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getRenewalBadge = (renewalDate: string | null) => {
    const daysUntil = getDaysUntilRenewal(renewalDate);
    if (!daysUntil) return null;
    
    if (daysUntil < 0) {
      return <Badge color="red">Expired</Badge>;
    } else if (daysUntil <= 30) {
      return <Badge color="orange">Renews in {daysUntil} days</Badge>;
    } else if (daysUntil <= 90) {
      return <Badge color="yellow">Renews in {Math.round(daysUntil / 30)} months</Badge>;
    }
    return null;
  };

  if (!asset) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 800, maxHeight: '85vh' }}>
        <Flex justify="between" align="center" mb="4">
          <Flex align="center" gap="3">
            <Text size="6">{getAssetIcon(asset.asset_type)}</Text>
            <div>
              <Dialog.Title>{asset.name}</Dialog.Title>
              <Text size="2" color="gray">
                {asset.brand} {asset.model} {asset.year && `(${asset.year})`}
              </Text>
            </div>
          </Flex>
          <Button variant="soft" onClick={onEdit}>
            <Pencil1Icon /> Edit
          </Button>
        </Flex>

        <Tabs.Root defaultValue="overview">
          <Tabs.List>
            <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
            <Tabs.Trigger value="maintenance">
              Maintenance ({maintenanceLogs.length})
            </Tabs.Trigger>
            <Tabs.Trigger value="contracts">
              Contracts ({contracts.length})
            </Tabs.Trigger>
          </Tabs.List>

          <div style={{ maxHeight: 'calc(85vh - 200px)', overflowY: 'auto', marginTop: '16px' }}>
            <Tabs.Content value="overview">
              <Flex direction="column" gap="4">
                {/* Basic Info */}
                <Card>
                  <Heading size="4" mb="3">Basic Information</Heading>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Text size="2" color="gray">Type</Text>
                      <Text size="3" weight="medium" className="capitalize">{asset.asset_type}</Text>
                    </div>
                    {asset.registration_number && (
                      <div>
                        <Text size="2" color="gray">Registration</Text>
                        <Text size="3" weight="medium">{asset.registration_number}</Text>
                      </div>
                    )}
                    {asset.serial_number && (
                      <div>
                        <Text size="2" color="gray">Serial Number</Text>
                        <Text size="3" weight="medium">{asset.serial_number}</Text>
                      </div>
                    )}
                    {asset.purchase_date && (
                      <div>
                        <Text size="2" color="gray">Purchase Date</Text>
                        <Text size="3" weight="medium">{formatDate(asset.purchase_date)}</Text>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Financial Info */}
                <Card>
                  <Heading size="4" mb="3">Financial Information</Heading>
                  <div className="grid grid-cols-2 gap-4">
                    {asset.purchase_price && (
                      <div>
                        <Text size="2" color="gray">Purchase Price</Text>
                        <Text size="3" weight="medium">{formatCurrency(asset.purchase_price)}</Text>
                      </div>
                    )}
                    {asset.current_value && (
                      <div>
                        <Text size="2" color="gray">Current Value</Text>
                        <Text size="3" weight="medium">{formatCurrency(asset.current_value)}</Text>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Ownership */}
                {asset.asset_owners && asset.asset_owners.length > 0 && (
                  <Card>
                    <Heading size="4" mb="3">Ownership</Heading>
                    <Flex direction="column" gap="2">
                      {asset.asset_owners.map((owner: any) => (
                        <Flex key={owner.id} justify="between" align="center">
                          <Flex gap="2" align="center">
                            {owner.owner_type === 'person' ? <PersonIcon /> : <ComponentInstanceIcon />}
                            <Text size="3">
                              {owner.person?.name || owner.company?.name}
                            </Text>
                          </Flex>
                          <Badge variant="soft">{owner.ownership_percentage}%</Badge>
                        </Flex>
                      ))}
                    </Flex>
                  </Card>
                )}

                {/* Property Association */}
                {asset.property_assets && asset.property_assets.length > 0 && (
                  <Card>
                    <Heading size="4" mb="3">Property Location</Heading>
                    <Flex gap="2" align="center">
                      <HomeIcon />
                      <Text size="3">
                        {asset.property_assets[0].property.name} - {asset.property_assets[0].property.address}
                      </Text>
                    </Flex>
                  </Card>
                )}

                {/* Notes */}
                {(asset.description || asset.notes) && (
                  <Card>
                    <Heading size="4" mb="3">Additional Information</Heading>
                    {asset.description && (
                      <div className="mb-3">
                        <Text size="2" color="gray">Description</Text>
                        <Text size="3">{asset.description}</Text>
                      </div>
                    )}
                    {asset.notes && (
                      <div>
                        <Text size="2" color="gray">Notes</Text>
                        <Text size="3">{asset.notes}</Text>
                      </div>
                    )}
                  </Card>
                )}
              </Flex>
            </Tabs.Content>

            <Tabs.Content value="maintenance">
              <Flex direction="column" gap="4">
                <Flex justify="between" align="center">
                  <Heading size="4">Maintenance History</Heading>
                  <Button onClick={onAddMaintenance}>
                    <GearIcon /> Add Maintenance
                  </Button>
                </Flex>

                {maintenanceLogs.length === 0 ? (
                  <Card>
                    <Text color="gray" align="center">No maintenance records yet</Text>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {maintenanceLogs.map((log) => (
                      <Card key={log.id}>
                        <Flex justify="between" align="start">
                          <div className="flex-1">
                            <Flex justify="between" align="center" mb="2">
                              <Badge>{log.maintenance_type}</Badge>
                              <Text size="2" color="gray">{formatDate(log.maintenance_date)}</Text>
                            </Flex>
                            <Text size="3" weight="medium" mb="1">{log.description}</Text>
                            {log.performed_by && (
                              <Text size="2" color="gray">Performed by: {log.performed_by}</Text>
                            )}
                            {log.notes && (
                              <Text size="2" color="gray" mt="1">{log.notes}</Text>
                            )}
                            {log.next_maintenance_date && (
                              <Flex gap="2" align="center" mt="2">
                                <CalendarIcon />
                                <Text size="2">Next maintenance: {formatDate(log.next_maintenance_date)}</Text>
                              </Flex>
                            )}
                          </div>
                          {log.cost && (
                            <Text size="3" weight="bold" color="blue">
                              {formatCurrency(log.cost)}
                            </Text>
                          )}
                        </Flex>
                      </Card>
                    ))}
                  </div>
                )}
              </Flex>
            </Tabs.Content>

            <Tabs.Content value="contracts">
              <Flex direction="column" gap="4">
                <Heading size="4">Related Contracts</Heading>

                {contracts.length === 0 ? (
                  <Card>
                    <Text color="gray" align="center">No contracts linked to this asset</Text>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {contracts.map((contract) => (
                      <Card key={contract.id}>
                        <Flex justify="between" align="center">
                          <div>
                            <Flex align="center" gap="3" mb="1">
                              <Text size="3" weight="medium">{contract.name}</Text>
                              <Badge>{contract.contract_type}</Badge>
                              {contract.auto_renewal && (
                                <Badge color="green" variant="soft">Auto-renewal</Badge>
                              )}
                              {getRenewalBadge(contract.renewal_date)}
                            </Flex>
                            <Text size="2" color="gray">
                              {contract.provider_name}
                            </Text>
                            <Flex gap="4" mt="2">
                              {contract.monthly_amount && (
                                <Text size="2">
                                  <Text weight="bold">{formatCurrency(contract.monthly_amount)}</Text>/month
                                </Text>
                              )}
                              {contract.renewal_date && (
                                <Text size="2">
                                  Renewal: <Text weight="bold">{formatDate(contract.renewal_date)}</Text>
                                </Text>
                              )}
                            </Flex>
                          </div>
                          {contract.portal_url && (
                            <a 
                              href={contract.portal_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-500 hover:text-blue-600"
                            >
                              <Text size="2">Portal</Text>
                              <ExternalLinkIcon />
                            </a>
                          )}
                        </Flex>
                      </Card>
                    ))}
                  </div>
                )}
              </Flex>
            </Tabs.Content>
          </div>
        </Tabs.Root>
      </Dialog.Content>
    </Dialog.Root>
  );
}