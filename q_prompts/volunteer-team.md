 # Task: Implement Complete Volunteer Team Management Functionality

  You are tasked with enhancing the volunteer teams page to match captain functionality. The current page has critical backend endpoint failures and missing UI features.

  ## **FILE LOCATIONS:**
  - **Target File**: `/src/app/[lang]/volunteer/venues/[venueId]/teams/[teamId]/page.tsx`
  - **Backend Router**: `/src/server/api/routers/volunteers/venueNew.ts`
  - **Reference Implementation**: `/src/app/[lang]/captain/teams/[teamId]/page.tsx`

  ## **PHASE 1: FIX CRITICAL BACKEND ENDPOINTS**

  ### 1.1 Create Missing tRPC Mutations
  Add these mutations to `/src/server/api/routers/volunteers/venueNew.ts`:

  ```typescript
  // Add Player Mutation
  addPlayer: protectedProcedure
    .input(z.object({
      teamId: z.string(),
      playerData: z.object({
        name: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        phone: z.string(),
        dateOfBirth: z.string(),
        gender: z.string(),
        whatsappNumber: z.string().optional(),
        village: z.string(),
        panchayat: z.string(),
        district: z.string(),
        position: z.enum(['main', 'substitute'])
      })
    }))
    .mutation(/* Implementation needed */),

  // Verify Player Mutation
  verifyPlayer: protectedProcedure
    .input(z.object({
      playerId: z.string(),
      status: z.enum(['pending', 'verified', 'approved', 'rejected']),
      comments: z.string(),
      teamId: z.string(),
      venueId: z.string()
    }))
    .mutation(/* Implementation needed */),

  // Promote Captain Mutation
  promoteCaptain: protectedProcedure
    .input(z.object({
      teamId: z.string(),
      newCaptainId: z.string()
    }))
    .mutation(/* Implementation needed */)

  Requirements:
  - Copy implementation logic from captain's equivalent endpoints
  - Ensure volunteer role validation
  - Use same database transaction patterns
  - Include proper error handling

  PHASE 2: ENHANCE TABLE COLUMNS

  2.1 Add Position Column

  Update playerColumns in volunteer page:

  {
    key: 'position',
    header: 'Position',
    render: (_value, player) => (
      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
        player.position === 'main'
          ? 'bg-[#F28C38] text-white'
          : 'bg-gray-200 text-gray-700'
      }`}>
        {player.position === 'main' ? 'Main Player' : 'Substitute'}
      </span>
    )
  }

  2.2 Add Location Column

  {
    key: 'location',
    header: 'Location',
    render: (_value, player) => (
      <div className="text-sm">
        <div className="text-gray-900">{player.village || 'N/A'}</div>
        <div className="text-gray-500">{player.district || 'N/A'}</div>
      </div>
    )
  }

  Requirements:
  - Position column should match captain page styling exactly
  - Location should show village/district in 2 lines
  - Handle null/undefined values gracefully

  PHASE 3: RESTORE DOCUMENT FUNCTIONALITY

  3.1 Uncomment and Integrate Document Display

  The document functionality is currently commented out (lines 821-963). You need to:

  1. Uncomment the document section from the old modal
  2. Integrate it into the new EnhancedModal player details modal
  3. Update document structure to match PlayerData interface:

  // Add to EnhancedModal content
  <div className="grid grid-cols-1 gap-6">
    <PlayerDocumentUpload
      playerId={selectedPlayer.id}
      playerUserId={selectedPlayer.userId || selectedPlayer.id}
      documentType="profilePhoto"
      label="Profile Photo"
      currentUrl={selectedPlayer.documents.profilePhoto?.url}
      onSuccess={async () => {
        const { data: updatedData } = await refetchTeam();
        // Update players state with fresh data
      }}
      onError={(error) => showError(`Upload failed: ${error}`)}
      variant="card"
    />
    {/* Repeat for aadhaarFront and aadhaarBack */}
  </div>

  Requirements:
  - All 3 document types: profilePhoto, aadhaarFront, aadhaarBack
  - Use variant="card" for large display
  - Implement proper refresh logic after upload
  - Handle upload errors with alert system

  PHASE 4: ADD PROMOTE CAPTAIN FUNCTIONALITY

  4.1 Add Promote Captain Button

  Update EnhancedModal footer to include promote captain button:

  footer={(
    <div className="flex justify-between">
      <button onClick={closeModal} className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg">
        Close
      </button>
      <div className="flex space-x-3">
        <button
          onClick={() => handlePromoteCaptain(selectedPlayer)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Promote Captain
        </button>
        <button
          onClick={() => handleEditPlayer(selectedPlayer)}
          className="px-4 py-2 bg-[#F28C38] text-white rounded-lg"
        >
          Edit Player
        </button>
      </div>
    </div>
  )}

  4.2 Implement Promote Captain Handler

  const promoteCaptainMutation = api.volunteers.venue.promoteCaptain.useMutation({
    onSuccess: () => {
      refetchTeam();
      setShowPlayerModal(false);
      setSelectedPlayer(null);
      showSuccess('Captain promoted successfully!');
    },
    onError: (error) => showError(`Error: ${error.message}`)
  });

  const handlePromoteCaptain = async (player: PlayerData) => {
    if (confirm(`Are you sure you want to promote ${player.name} to team captain?`)) {
      promoteCaptainMutation.mutate({
        teamId: teamId,
        newCaptainId: player.userId || player.id
      });
    }
  };

  Requirements:
  - Include confirmation dialog
  - Use same styling as captain page
  - Handle success/error states
  - Refresh team data after promotion

  PHASE 5: ENHANCE ADD PLAYER MODAL

  5.1 Improve Position Validation

  Copy position validation logic from captain page:

  // Add computed properties for position limits
  const availablePositions = useMemo(() => {
    const mainCount = players.filter(p => p.position === 'main').length;
    const subCount = players.filter(p => p.position === 'substitute').length;

    return {
      main: { available: mainCount < maxMainPlayers, count: mainCount },
      substitute: { available: subCount < maxSubPlayers, count: subCount }
    };
  }, [players]);

  // Update position select with validation
  <select
    value={playerFormData.position}
    onChange={(e) => setPlayerFormData(prev => ({ ...prev, position: e.target.value }))}
  >
    <option value="main" disabled={!availablePositions.main.available}>
      Main Player {!availablePositions.main.available ? '(Full)' : ''}
    </option>
    <option value="substitute" disabled={!availablePositions.substitute.available}>
      Substitute {!availablePositions.substitute.available ? '(Full)' : ''}
    </option>
  </select>

  // Add position summary
  <div className="text-sm text-gray-600">
    Main: {availablePositions.main.count}/{maxMainPlayers} •
    Substitutes: {availablePositions.substitute.count}/{maxSubPlayers}
  </div>

  PHASE 6: UPDATE INTERFACES

  6.1 Ensure PlayerData Interface Completeness

  interface PlayerData {
    id: string;
    userId?: string;
    name: string;
    firstName?: string;
    lastName?: string;
    phone: string;
    age: number;
    gender: string;
    position: string;
    dob?: string;
    whatsappNumber?: string;
    village?: string;
    district?: string; // ADD THIS
    panchayat?: string; // ADD THIS
    documents: {
      profilePhoto: { url?: string | null; verified: boolean; storagePath?: string | null; uploadedBy?: string | null; uploadedAt?: string | null };
      aadhaarFront: { url?: string | null; verified: boolean; storagePath?: string | null; uploadedBy?: string | null; uploadedAt?: string | null };
      aadhaarBack: { url?: string | null; verified: boolean; storagePath?: string | null; uploadedBy?: string | null; uploadedAt?: string | null };
    };
    verificationStatus: string;
    matchDayVerificationStatus?: string;
    matchDayComments?: string;
  }

  TESTING REQUIREMENTS:

  1. Backend Testing:
    - Test all 3 new tRPC mutations work
    - Verify volunteer role permissions
    - Test error handling
  2. Frontend Testing:
    - Test add player with position validation
    - Test promote captain functionality
    - Test document upload/display
    - Test table column rendering
    - Test modal functionality
  3. Integration Testing:
    - Test complete workflow: add player → upload docs → verify → promote
    - Test error scenarios and user feedback

  CRITICAL SUCCESS CRITERIA:

  ✅ No more "No procedure found" errors
  ✅ Add Player modal works with position field
  ✅ Table shows Position and Location columns
  ✅ OnRowClick shows player details with all 3 documents
  ✅ Promote Captain button works in both captain and volunteer pages
  ✅ No Remove Player button in onRowClick (only Edit and Promote Captain)
  ✅ All functionality matches captain page behavior

  IMPLEMENTATION ORDER:

  1. Backend mutations (fixes runtime errors)
  2. Table columns (immediate UI improvement)
  3. Document display (restore commented functionality)
  4. Promote captain (new feature)
  5. Enhanced position validation (refinement)

  Each phase should be tested before moving to the next. Focus on getting basic functionality working before adding enhancements.

  This prompt provides a complete roadmap for implementing all the missing functionality while maintaining consistency with the captain's page implementation.