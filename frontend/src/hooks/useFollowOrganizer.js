import { useState } from "react";
import api from "../api/axios";

export default function useFollowOrganizer({ onProfileUpdated, onSuccess, onError } = {}) {
  const [loadingId, setLoadingId] = useState(null);

  const follow = async (organizerId) => {
    try {
      setLoadingId(organizerId);
      await api.post(`/participants/follow/${organizerId}`);
      if (onProfileUpdated) {
        await onProfileUpdated();
      }
      if (onSuccess) {
        onSuccess("Followed successfully!");
      }
    } catch (err) {
      if (onError) {
        onError(err.response?.data?.error || "Failed to follow");
      }
    } finally {
      setLoadingId(null);
    }
  };

  const unfollow = async (organizerId) => {
    try {
      setLoadingId(organizerId);
      await api.post(`/participants/unfollow/${organizerId}`);
      if (onProfileUpdated) {
        await onProfileUpdated();
      }
      if (onSuccess) {
        onSuccess("Unfollowed successfully!");
      }
    } catch (err) {
      if (onError) {
        onError(err.response?.data?.error || "Failed to unfollow");
      }
    } finally {
      setLoadingId(null);
    }
  };

  return { follow, unfollow, loadingId };
}
