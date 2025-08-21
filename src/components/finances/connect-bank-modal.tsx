"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  Button,
  Flex,
  Text,
  TextField,
  Select,
  Heading,
  Card,
  Badge,
} from "@radix-ui/themes";
import { Cross2Icon, ExternalLinkIcon, ReloadIcon } from "@radix-ui/react-icons";
import type { GoCardlessInstitution } from "@/types/finances";

interface ConnectBankModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ConnectBankModal({
  open,
  onOpenChange,
  onSuccess,
}: ConnectBankModalProps) {
  const [step, setStep] = useState<"institution" | "connecting">("institution");
  const [loading, setLoading] = useState(false);
  const [allInstitutions, setAllInstitutions] = useState<(GoCardlessInstitution & { country: string; countryName: string })[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState<GoCardlessInstitution | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [countryFilter, setCountryFilter] = useState<string>("ALL");
  const [connectionStatus, setConnectionStatus] = useState<{
    status: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (open && step === "institution" && allInstitutions.length === 0) {
      fetchAllInstitutions();
    }
  }, [open, step]);

  useEffect(() => {
    if (!open) {
      // Reset modal state when closed
      setStep("institution");
      setSelectedInstitution(null);
      setSearchTerm("");
      setCountryFilter("ALL");
      setConnectionStatus(null);
    }
  }, [open]);

  const getCountryName = (code: string): string => {
    const countryNames: Record<string, string> = {
      'GB': 'United Kingdom', 'DE': 'Germany', 'FR': 'France', 'ES': 'Spain',
      'IT': 'Italy', 'NL': 'Netherlands', 'BE': 'Belgium', 'AT': 'Austria',
      'IE': 'Ireland', 'FI': 'Finland', 'EE': 'Estonia', 'LV': 'Latvia',
      'LT': 'Lithuania', 'PL': 'Poland', 'PT': 'Portugal', 'SE': 'Sweden',
      'DK': 'Denmark', 'NO': 'Norway'
    };
    return countryNames[code] || code;
  };

  const fetchAllInstitutions = async () => {
    try {
      setLoading(true);
      
      // Fetch institutions from all major European countries
      const countries = ['GB', 'DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'AT', 'IE', 'FI', 'EE', 'LV', 'LT', 'PL', 'PT', 'SE', 'DK', 'NO'];
      const institutionPromises = countries.map(async (country) => {
        try {
          const response = await fetch(`/api/finances/institutions?country=${country}`);
          if (response.ok) {
            const data = await response.json();
            return (data.institutions || []).map((inst: GoCardlessInstitution) => ({
              ...inst,
              country,
              countryName: getCountryName(country)
            }));
          }
          return [];
        } catch (error) {
          console.warn(`Failed to fetch institutions for ${country}:`, error);
          return [];
        }
      });

      const allResults = await Promise.all(institutionPromises);
      const combinedInstitutions = allResults.flat();
      
      // Sort by name for better searchability
      combinedInstitutions.sort((a, b) => a.name.localeCompare(b.name));
      
      setAllInstitutions(combinedInstitutions);
    } catch (error) {
      console.error("Error fetching institutions:", error);
      setAllInstitutions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectBank = async () => {
    if (!selectedInstitution) return;

    try {
      setLoading(true);
      setStep("connecting");
      setConnectionStatus({ status: "connecting", message: "Initiating connection..." });

      const response = await fetch("/api/finances/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: selectedInstitution.id,
          institutionName: selectedInstitution.name,
          countryCode: (selectedInstitution as any).country,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to initiate connection");
      }

      const { authUrl } = await response.json();
      
      setConnectionStatus({ 
        status: "redirecting", 
        message: "Redirecting to your bank..." 
      });

      // Open bank authorization in new window
      const authWindow = window.open(
        authUrl,
        "bankAuth",
        "width=600,height=700,scrollbars=yes,resizable=yes"
      );

      // Poll for window closure (user completed auth)
      const pollTimer = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(pollTimer);
          checkConnectionStatus();
        }
      }, 1000);

      // Set timeout for the auth process
      setTimeout(() => {
        clearInterval(pollTimer);
        if (!authWindow?.closed) {
          authWindow?.close();
          setConnectionStatus({
            status: "timeout",
            message: "Connection timed out. Please try again."
          });
        }
      }, 300000); // 5 minutes timeout

    } catch (error) {
      console.error("Error connecting bank:", error);
      setConnectionStatus({
        status: "error",
        message: "Failed to connect to bank. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const checkConnectionStatus = async () => {
    try {
      setConnectionStatus({ 
        status: "checking", 
        message: "Checking connection status..." 
      });

      // Poll the status endpoint to see if connection was completed
      let attempts = 0;
      const maxAttempts = 10;
      
      const pollStatus = async () => {
        attempts++;
        
        const response = await fetch("/api/finances/status");
        const data = await response.json();
        
        if (data.hasRecentConnection) {
          setConnectionStatus({
            status: "success",
            message: "Bank connected successfully!"
          });
          
          // Wait a moment then close modal and refresh
          setTimeout(() => {
            onSuccess();
          }, 2000);
        } else if (attempts < maxAttempts) {
          setTimeout(pollStatus, 2000); // Check again in 2 seconds
        } else {
          setConnectionStatus({
            status: "pending",
            message: "Connection may still be processing. Please check your accounts."
          });
        }
      };
      
      pollStatus();
    } catch (error) {
      console.error("Error checking connection status:", error);
      setConnectionStatus({
        status: "error",
        message: "Could not verify connection status."
      });
    }
  };

  // Filter institutions by search term and country
  const filteredInstitutions = allInstitutions.filter(institution => {
    const matchesSearch = institution.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCountry = countryFilter === "ALL" || institution.country === countryFilter;
    return matchesSearch && matchesCountry;
  });

  // Get list of available countries for filter
  const availableCountries = ["ALL", ...Array.from(new Set(allInstitutions.map(inst => inst.country)))].sort();

  const renderInstitutionSelection = () => (
    <div className="space-y-4">
      <Text size="3">Choose your bank from any European country:</Text>

      {/* Search and Filter Controls */}
      <div className="space-y-3">
        <TextField.Root
          placeholder="Search for your bank (e.g., N26, Revolut, Chase, HSBC)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        
        <Select.Root value={countryFilter} onValueChange={setCountryFilter}>
          <Select.Trigger placeholder="Filter by country (optional)" />
          <Select.Content>
            <Select.Item value="ALL">🌍 All Countries</Select.Item>
            {availableCountries.slice(1).map((country) => (
              <Select.Item key={country} value={country}>
                {getCountryName(country)}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </div>

      {loading ? (
        <Flex justify="center" align="center" className="py-8">
          <ReloadIcon className="animate-spin" />
          <Text ml="2">Loading banks from all countries...</Text>
        </Flex>
      ) : (
        <div className="max-h-96 overflow-y-auto space-y-2">
          {filteredInstitutions.map((institution) => (
            <Card
              key={`${institution.country}-${institution.id}`}
              className={`cursor-pointer transition-colors ${
                selectedInstitution?.id === institution.id
                  ? "ring-2 ring-blue-500 bg-blue-50"
                  : "hover:bg-gray-50"
              }`}
              onClick={() => setSelectedInstitution(institution)}
            >
              <Flex justify="between" align="center">
                <Flex align="center" gap="3">
                  {institution.logo && (
                    <img 
                      src={institution.logo} 
                      alt={institution.name}
                      className="w-8 h-8 object-contain"
                    />
                  )}
                  <div>
                    <Text weight="medium">{institution.name}</Text>
                    <Text size="2" color="gray">
                      {institution.countryName}
                      {institution.bic && ` • ${institution.bic}`}
                    </Text>
                  </div>
                </Flex>
                <Badge size="2" variant="soft">
                  {institution.country}
                </Badge>
              </Flex>
            </Card>
          ))}
        </div>
      )}

      {!loading && filteredInstitutions.length === 0 && (
        <Flex justify="center" align="center" className="py-8">
          <Text color="gray">
            No banks found{searchTerm && ` for "${searchTerm}"`}
            {countryFilter !== "ALL" && ` in ${getCountryName(countryFilter)}`}
          </Text>
          <Text size="2" color="gray" mt="2">
            Try searching by bank name or selecting a different country
          </Text>
        </Flex>
      )}

      <Flex justify="end" gap="3" mt="6">
        <Dialog.Close>
          <Button variant="outline">Cancel</Button>
        </Dialog.Close>
        <Button 
          onClick={handleConnectBank}
          disabled={!selectedInstitution || loading}
        >
          <ExternalLinkIcon />
          Connect to {selectedInstitution?.name}
        </Button>
      </Flex>
    </div>
  );

  const renderConnecting = () => (
    <div className="space-y-4 text-center py-8">
      <Flex justify="center" align="center" direction="column" gap="4">
        {connectionStatus?.status === "connecting" && (
          <ReloadIcon className="animate-spin w-8 h-8" />
        )}
        
        <div>
          <Text size="4" weight="medium" mb="2" display="block">
            {connectionStatus?.status === "success" ? "Success!" : "Connecting to your bank"}
          </Text>
          <Text color="gray">
            {connectionStatus?.message}
          </Text>
        </div>

        {connectionStatus?.status === "error" && (
          <Button onClick={() => setStep("institution")} variant="outline">
            Try Again
          </Button>
        )}

        {connectionStatus?.status === "success" && (
          <Text size="2" color="green">
            Your accounts will be available shortly.
          </Text>
        )}
      </Flex>
    </div>
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content size="3" maxWidth="700px">
        <Dialog.Title>
          <Flex justify="between" align="center">
            <Heading size="6">Connect Bank Account</Heading>
            <Dialog.Close>
              <Button variant="ghost" size="2">
                <Cross2Icon />
              </Button>
            </Dialog.Close>
          </Flex>
        </Dialog.Title>

        <div className="mt-4">
          {step === "institution" && renderInstitutionSelection()}
          {step === "connecting" && renderConnecting()}
        </div>

        {step !== "connecting" && (
          <Text size="2" color="gray" className="mt-4 block">
            Your data is encrypted and securely transmitted. We use GoCardless for bank connections.
          </Text>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}