import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useCSV } from "../context/CSVContext";
import { parseCsvFile } from "../utils/csvParse";
import { toast } from "sonner";

const CHANNELS = ["InboundCC", "Retail", "Web"] as const;
type Channel = (typeof CHANNELS)[number];

function findChannelFile(folderFiles: File[], channel: Channel): File | undefined {
  const keyword = channel.toLowerCase().replace(/[^a-z0-9]/g, '');
  return folderFiles.find(file => {
    const normalizedFileName = file.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return normalizedFileName.includes(keyword);
  });
}

function buildChannelAddRowDefaults(params: {
  offerPyName: string;
  channel: Channel;
}): Record<string, string> {
  const { offerPyName, channel } = params;
  const offerName = offerPyName;
  const pyName = `${offerName}_${channel}`;

  return {
    OfferName: offerName,
    pyName,
    pyLabel: pyName,
    ShortDescription: pyName,
  };
}

export default function ChannelsSelect() {
  const navigate = useNavigate();
  const { 
    folderFiles,
    setCsvData,
    setSelectedFileName,
    selectedChannels,
    setSelectedChannels,
    setCurrentChannelIndex,
    setWorkflowStep,
    lastAddedOfferPyName,
    setAddRowDefaults,
    multiCsvUpdates,
  } = useCSV();

  const [localSelected, setLocalSelected] = useState<Channel[]>([]);

  const canContinue = useMemo(() => {
    return localSelected.length > 0 && !!lastAddedOfferPyName;
  }, [localSelected.length, lastAddedOfferPyName]);

  const toggle = (channel: Channel) => {
    setLocalSelected(prev => {
      if (prev.includes(channel)) {
        return prev.filter(c => c !== channel);
      }
      return [...prev, channel];
    });
  };

  const handleContinue = async () => {
    if (!lastAddedOfferPyName) {
      toast.error("Offer step must be completed before selecting channels.");
      return;
    }
    if (localSelected.length === 0) {
      toast.error("Select at least one channel.");
      return;
    }

    // Persist selection into context
    setSelectedChannels(localSelected);
    setCurrentChannelIndex(0);
    setWorkflowStep("channel-offer");

    const firstChannel = localSelected[0];
    const channelFile = findChannelFile(folderFiles, firstChannel);

    if (!channelFile) {
      toast.error(`Channel CSV not found for ${firstChannel}.`);
      return;
    }

    // Load channel CSV into context (reusing any existing in-memory updates)
    const channelFileName = channelFile.name;
    if (multiCsvUpdates[channelFileName]) {
      setCsvData(multiCsvUpdates[channelFileName]);
      setSelectedFileName(channelFileName);
    } else {
      const parsed = await parseCsvFile(channelFile);
      setCsvData(parsed);
      setSelectedFileName(channelFileName);
    }

    // Prefill derived fields for the channel offer row.
    const defaults = buildChannelAddRowDefaults({
      offerPyName: lastAddedOfferPyName,
      channel: firstChannel,
    });
    setAddRowDefaults(defaults);

    // Reuse AddRowForm for the channel-offer screen UI.
    navigate("/add-row");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="mb-2">Channels</h1>
        <p className="text-muted-foreground">
          Select one or more channels to generate channel-based offers.
        </p>

        <Card className="p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Choose Channels</p>
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map(channel => (
                  <Button
                    key={channel}
                    type="button"
                    variant={localSelected.includes(channel) ? "default" : "outline"}
                    onClick={() => toggle(channel)}
                    size="sm"
                  >
                    {channel}
                  </Button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button
                size="lg"
                className="w-full"
                onClick={handleContinue}
                disabled={!canContinue}
              >
                Continue
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

