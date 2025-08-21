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
  const [step, setStep] = useState<"country" | "institution" | "connecting">("country");
  const [loading, setLoading] = useState(false);
  const [countries] = useState([
    { code: "GB", name: "United Kingdom" },
    { code: "DE", name: "Germany" },
    { code: "FR", name: "France" },
    { code: "ES", name: "Spain" },
    { code: "IT", name: "Italy" },
    { code: "NL", name: "Netherlands" },
    { code: "BE", name: "Belgium" },
    { code: "AT", name: "Austria" },
    { code: "IE", name: "Ireland" },
    { code: "FI", name: "Finland" },
    { code: "EE", name: "Estonia" },
    { code: "LV", name: "Latvia" },
    { code: "LT", name: "Lithuania" },
  ]);
  const [selectedCountry, setSelectedCountry] = useState("GB");
  const [institutions, setInstitutions] = useState<GoCardlessInstitution[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState<GoCardlessInstitution | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<{
    status: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (step === "institution") {
      fetchInstitutions();
    }
  }, [step, selectedCountry]);

  useEffect(() => {
    if (!open) {
      // Reset modal state when closed
      setStep("country");
      setSelectedInstitution(null);
      setSearchTerm("");
      setConnectionStatus(null);
    }
  }, [open]);

  const fetchInstitutions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/finances/institutions?country=${selectedCountry}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch institutions');
      }
      
      const data = await response.json();
      setInstitutions(data.institutions || []);
    } catch (error) {
      console.error("Error fetching institutions:", error);
      setInstitutions([]);
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
          countryCode: selectedCountry,
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

  const filteredInstitutions = institutions.filter(institution =>
    institution.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderCountrySelection = () => (
    <div className="space-y-4">
      <Text size="3">Select your country to see available banks:</Text>
      
      <Select.Root value={selectedCountry} onValueChange={setSelectedCountry}>
        <Select.Trigger />
        <Select.Content>
          {countries.map((country) => (
            <Select.Item key={country.code} value={country.code}>
              {country.name}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>

      <Flex justify="end" gap="3" mt="6">
        <Dialog.Close>
          <Button variant="outline">Cancel</Button>
        </Dialog.Close>
        <Button onClick={() => setStep("institution")}>
          Next
        </Button>
      </Flex>
    </div>
  );

  const renderInstitutionSelection = () => (
    <div className="space-y-4">
      <Flex justify="between" align="center">
        <Text size="3">Choose your bank:</Text>
        <Button variant="ghost" size="1" onClick={() => setStep("country")}>
          ← Back
        </Button>
      </Flex>

      <TextField.Root
        placeholder="Search for your bank..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {loading ? (
        <Flex justify="center" align="center" className="py-8">
          <ReloadIcon className="animate-spin" />
          <Text ml="2">Loading banks...</Text>
        </Flex>
      ) : (
        <div className="max-h-96 overflow-y-auto space-y-2">
          {filteredInstitutions.map((institution) => (
            <Card
              key={institution.id}
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
                    {institution.bic && (
                      <Text size="2" color="gray">{institution.bic}</Text>
                    )}
                  </div>
                </Flex>
                <Flex align="center" gap="2">
                  {institution.countries.map(country => (
                    <Badge key={country} size="1" variant="soft">
                      {country}
                    </Badge>
                  ))}
                </Flex>
              </Flex>
            </Card>
          ))}
        </div>
      )}

      {!loading && filteredInstitutions.length === 0 && (
        <Flex justify="center" align="center" className="py-8">
          <Text color="gray">No banks found for "{searchTerm}"</Text>
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
      <Dialog.Content size="3" maxWidth="600px">
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
          {step === "country" && renderCountrySelection()}
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